# customops — SixDee Seahorse SDK operations

Drop-in operations built against the Seahorse SDK extension points, packaged as a thin jar placed
in `/resources/jars`. Nothing in the core (`deeplang`, `we.jar`, `code_executor.py`,
`StandardOperations`) is modified.

| Operation | Ports | `transform` |
|---|---|---|
| **Transformation 1 To 2** | 1 DataFrame → 2 DataFrames + `MlflowModel` | `def transform(df)` → `return first, second` |
| **Transformation 2 To 1** | 2 DataFrames → 1 DataFrame + `MlflowModel` | `def transform(df1, df2)` → `return one_dataframe` |
| **Transformation 2 To 2** | 2 DataFrames → 2 DataFrames + `MlflowModel` | `def transform(df1, df2)` → `return first, second` |
| **Push To MLflow** | `MlflowModel` → 1 DataFrame | no code — typed parameters only |
| **Push To MLflow With Signature** | `MlflowModel` + 2 DataFrames → 1 DataFrame | no code — typed parameters only |
| **MLFLOWPUSH metrics** | 1 DataFrame → 1 DataFrame | no code — typed parameters only |

All three appear in the palette under the **sixdee** category (the display name is one string in
[SixDeeOperations.scala](src/main/scala/ai/deepsense/customops/SixDeeOperations.scala)).

## Package layout

Mirrors `deeplang`'s own, so the plugin reads like the code it extends:

```
ai.deepsense.customops
├── catalogs/     SixDeeCategory, SixDeeOperations   - the CatalogRegistrant entry point
├── doperables/   MlflowModel                        - the typed port value
├── doperations/  Transformation{1To2,2To1,2To2}, PushToMlflow,
│                PushToMlflowWithSignature, PushMetricsToMlflow, MlflowPredict
└── python/       PythonShim, PythonOperationRunner  - shared internals
```

## The model port

Every transformation has a trailing **`MlflowModel`** output port. The model object itself cannot
cross a port — it lives in the Python process — so the port carries what a downstream node needs:
the artifact's directory, the MLflow flavour that wrote it, and the metrics and params the training
code recorded.

**Producing one is optional.** The shim injects a `save_model()` into your namespace; call it and
the port carries a model, ignore it and the port carries an empty one. The `transform` return
contract is unchanged either way — the model does not go through the return value.

```python
def transform(df):
    pdf = df.toPandas()
    X, y = pdf.drop(columns=["churn"]), pdf["churn"]

    model = RandomForestClassifier().fit(X, y)
    save_model(model, metrics={"auc": 0.83}, params={"n_estimators": 100})

    return X, y                      # the DataFrame ports, exactly as before
```

`save_model` picks the directory, detects the flavour from the model's own module (sklearn,
xgboost, lightgbm, catboost, statsmodels, pytorch, tensorflow, spark, prophet — or pass
`flavor=`), and calls that flavour's `save_model`. Nothing in your code mentions MLflow.

Artifacts go under `SEAHORSE_MODEL_DIR`, default `/library/seahorse-models/<workflow>/<node>`.
`/library` is the right default: it is mounted read-write in the session container and shared with
the notebook and library services, so it survives restarts and other nodes can read it. On a
multi-host cluster it is a host bind mount and will not be shared — use S3/HDFS there.

**Not mandatory, three ways over:** the code need not call `save_model()`; the port need not be
connected (nothing validates output connectivity); and a node that consumes one says so — `Push To
MLflow` rejects an empty model with a message naming the fix rather than failing obscurely.

## Push To MLflow

Takes the model port, so the path, flavour, metrics and params are already known — it reads them
off the port rather than out of a conventionally-named DataFrame. It takes **no code**: the whole
MLflow script is generated from four parameters.

| Parameter | |
|---|---|
| `registered model name` | empty → log without registering; otherwise also names the experiment |

The tracking store comes from `MLFLOW_TRACKING_URI`. The experiment is the registered model name
(or `seahorse`), and the run name is that plus a timestamp, so successive pushes of one model stay
comparable in a single experiment view.

It logs params, metrics and the artifacts, then optionally registers, and outputs one row:
`run_id`, `run_name`, `experiment`, `experiment_id`, `model_uri`, `registered_model`,
`model_version`, `tracking_uri`.

## Push To MLflow With Signature

Same push, plus the `signature:` block that MLflow's **Schema → Inputs / Outputs** panel is
rendered from. `save_model()` only writes one when the training code passed `input_example=`;
without it the panel is blank, and the model is also intolerant of extra columns at scoring time,
because MLflow has no declared input list to select by.

| Port | |
|---|---|
| 0 | the `MlflowModel` |
| 1 | the model's **inputs** — one row per observation, the feature columns |
| 2 | the model's **outputs** — the predictions or labels |

| Parameter | |
|---|---|
| `registered model name` | as above |
| `input file name` | the CSV the port-1 sample is logged as, under the run's `data/` folder; empty → the registered model name. A `.csv` suffix is added if missing, and anything but letters, digits, `-`, `_` and `.` becomes `_` |
| `sample rows` | rows read from each frame (default 1000). A signature records names and types, not data |

**Every column of both frames goes into the signature.** Port 1 is what the model will demand when
it scores, so drop label and id columns from it; port 2 wants the predictions on their own, so
project a `Transform` node's output down before wiring it in — it carries the features alongside
the predictions and would declare those as outputs too.

The port-1 sample is also logged to the run as `data/<input file name>` — beside `model/`, so the
data the signature was built from can be read next to the model it describes. It is the same
`sample rows` the signature came from, not the whole input.

Both DataFrame ports are **required** — Seahorse has no optional input ports, which is why this is
a separate node rather than two extra ports on `Push To MLflow`.

The signature is written onto a **copy** of the model directory, so the artifact the training node
wrote under `SEAHORSE_MODEL_DIR` is read and never modified; only what goes to MLflow carries it.
The run is tagged `seahorse.signature=inferred`, and the output row adds `signature_inputs`,
`signature_outputs` and `input_file` to the columns above.

## MLFLOWPUSH metrics

Logs metrics against a model **already in the registry**, selected the way `MLflow Predict`
selects one — by name and version or alias — so the training node need not be in this workflow.
The single input port carries the metrics; the model is named by parameters, not wired in.
(The class behind it is `PushMetricsToMlflow`.)

| Parameter | |
|---|---|
| `model name` | registered model name, e.g. `churn` |
| `version or alias` | a number (`3`), an alias (`champion`), or empty for the latest version |

MLflow attaches metrics to **runs**, not to model versions, so the version is resolved to the run
that produced it and the metrics go there — which is what the version's page displays. The run is
written through `MlflowClient.log_metric`, which does not reopen it, so a `FINISHED` run stays
finished and no new run appears. A version registered straight from a path has no source run and
is refused with that as the reason.

The input is read in whichever of the two shapes it is in, with nothing to configure:

| Shape | |
|---|---|
| **long** | a name column (`metric`, `metric_name`, `name` or `key`) and a value column (`value` or `metric_value`), one row per metric. Matched case-insensitively |
| **wide** | one row; every numeric column is a metric named after the column. Non-numeric columns are skipped and reported, not fatal |

Logging a key that is already there appends to its history; the page shows the latest.

Every push is **read back off the run** before the node reports success: the run is fetched and
each metric compared against what was sent, so a tracking store that accepts a write without
keeping it — read-only, or pointing somewhere other than the registry the model came from — fails
here rather than silently leaving a dashboard wrong.

Output is one row: `model_name`, `model_version`, `run_id`, `experiment_id`, `metrics` (JSON of
what was logged), `metric_count`, `skipped_columns`, `validated`, `tracking_uri`.

Prefer `save_model(model, input_example=X)` in the training code when you can — that puts the
signature on the model everywhere, including the on-disk copy that `Transform` and `MLflow Predict`
load. This node is for models already trained without one.

> **Before this is useful, settle the tracking store.** With `tracking uri` empty and no
> `MLFLOW_TRACKING_URI`, MLflow 3 defaults to a SQLite file in the driver's *working directory* —
> an ephemeral container path, so runs are lost on restart. Point it at a persistent store. The
> Model Registry additionally needs a database-backed or HTTP URI; a plain file store cannot
> register models, and the node says so if you try.

## Why `CatalogRegistrant` and not `@Register`

There are two ways into the operation catalog:

- `@ai.deepsense.deeplang.refl.Register` — found by reflection, but `CatalogScanner` hardcodes
  `DOperationCategories.UserDefined` for everything it finds, so it can only ever produce
  "User defined";
- the `CatalogRegistrant` SPI — declared in
  `META-INF/services/ai.deepsense.deeplang.catalogs.spi.CatalogRegistrant`, which lets the plugin
  choose its own `DOperationCategory`.

[SixDeeOperations.scala](src/main/scala/ai/deepsense/customops/SixDeeOperations.scala) uses the
second, so an operation here must **not** also carry `@Register`:
`DOperationsCatalog.registerDOperation` throws on a duplicate operation id, and that exception
takes down the whole catalog, not just the plugin.

## Writing the code

Each node opens on a signature and nothing else — no example to delete first:

```python
def transform(df1, df2):
    pass
```

What to return is in the `code` parameter's description, which the editor shows as help text. Run a
node unedited and it says what is missing rather than failing obscurely.

`df1` is the left input port, `df2` the right; the one-input operation just gets `df`. All are
real PySpark DataFrames. The argument count is checked before your code runs, and the error names
the signature the operation expects.

### Which ports must be wired

- **Every input port must be connected.** `NodeInferenceImpl.inputInferenceForNode` loops over
  `0 until inArity` and turns any unconnected port into `NoInputEdgesException`, an inference
  *error*; `StatefulGraph.handleInferredKnowledge` then refuses the whole run with "Provided
  workflow cannot be launched, because it contains errors". There is no per-port optionality flag,
  and `inferKnowledgeUntyped` is `final`, so an operation cannot opt out. If you need a one-input
  node, that has to be a separate operation with `inArity = 1`.
- **Output ports need not be connected.** Nothing validates output connectivity, so leaving the
  second output of a two-output operation unwired is fine — the Python still has to return both
  values, but the second DataFrame simply goes nowhere.

### What each output value may be

| Returned | Result |
|---|---|
| list of dicts / dataclasses / named tuples / pydantic models / `Row`s | one row per object; columns are the union of field names in first-seen order, missing fields become `null`, `_`-prefixed attributes are dropped |
| a single such object (not a list) | a one-row DataFrame |
| nested objects / dicts | nested `struct` columns; lists become `array` columns |
| list of tuples or lists | one row per tuple, positional columns |
| list of scalars | a single-column DataFrame |
| a **pandas Series** | a one-column DataFrame named after the Series (`value` if it has no name) |
| a **numpy array** | 1-D → one column; 2-D → positional columns |
| a Spark DataFrame | passed through unchanged |
| a pandas DataFrame | converted by the executor's existing Arrow path |

pandas and numpy objects are treated as *data*, never scraped for attributes as if they were row
objects — that mistake is what used to make `return X, y` fail with "have no readable fields".

**One ambiguity is refused rather than guessed.** For the two-output operations, returning two bare
row-objects
(`return {"a": 1}, {"b": 2}`) could mean two one-row DataFrames or one DataFrame of two rows, so it
fails with a message telling you to wrap each output explicitly: `return [row_a], [row_b]`.

### Controlling the schema

There is no schema parameter — the only parameter is `code`, matching the built-in
**Python Transformation**. When you need an explicit schema, express it in Python by returning a
Spark DataFrame rather than a list:

```python
def transform(df1, df2):
    return spark.createDataFrame(rows, "customer_id STRING, total DOUBLE")
```

That is also the answer when an output can be **empty**: an empty list carries no column
information, so it fails with a message pointing at exactly this. Same for a column that is
all-null or whose type varies between rows.

Because the schema only exists once the Python has run, the output's schema is unknown at
inference time, so the editor cannot offer column names to downstream nodes — again the same as
the built-in Python Transformation.

## How extra ports reach a single-port Python runtime

`code_executor.py` only ever calls a **single-argument** `transform`, only ever hands it input
port 0, and only ever registers output port 0. Rather than fork the Python runtime, the operations
generate a shim ([PythonShim.scala](src/main/scala/ai/deepsense/customops/PythonShim.scala)) around
the user's code:

- **input 0** arrives normally through `DataFrameStorage` and becomes `df1`;
- **input 1** is published as a **global** temporary view, which the shim reads back as `df2`.
  Global, because the Python side runs in `sparkSession.newSession()` — that shares `SharedState`
  (and therefore the `global_temp` database) with the JVM session, but not ordinary temp views;
- **output 0** goes back through the normal channel, so `isValid` still sees the arity-1
  `transform` it requires;
- **output 1** is published by the shim as another global temp view, which the operation reads back
  with `spark.table(...)`.

Views are named per node (`seahorse_py_in1_<nodeId>`, `seahorse_py_out1_<nodeId>`), so a re-run
replaces its own and concurrent nodes never collide, and are dropped in a `finally`.

Dropping them is safe: analysis inlines a view's stored plan, so a DataFrame read via
`spark.table(...)` keeps working after the view is gone.
[GlobalTempViewProbe](src/test/scala/ai/deepsense/customops/GlobalTempViewProbe.scala) asserts
exactly that against real Spark, along with the cross-session visibility the design depends on:

```
$ sbt "customops/Test/runMain ai.deepsense.customops.GlobalTempViewProbe"
newSession() sees the view: rows=2
catalog still has probe_v: false
collect AFTER drop: a,b
count  AFTER drop: 2
fresh lookup after drop fails as expected: true
```

## Build and versioning

The plugin is versioned independently of the core build, in
[build.sbt](build.sbt) — **bump it whenever you build a jar for deployment**, so what is running is
identifiable.

```bash
cd seahorse-workflow-executor
sbt customops/package          # NOT assembly - deeplang and Spark come from the runtime classpath
cp customops/target/scala-2.13/seahorse-custom-ops_2.13-1.1.0.jar <deploy>/jars/
```

A bump changes the jar's filename, so the previous jar is **not** overwritten. Delete it. Two
versions side by side both register the same operation ids, and
`DOperationsCatalog.registerDOperation` throws on a duplicate id — which takes down the entire
operations catalog, not just this plugin. `rm <deploy>/jars/seahorse-custom-ops_2.13-*.jar` before
copying is the safe habit.

`customops` is deliberately outside `rootProject`'s aggregate and is not a dependency of
`workflowexecutor`, so it never enters `we.jar` and never affects the core build or its tests.

## Deploy

The deploy directory's `jars` folder is mounted at `/resources/jars` in both **sessionmanager**
(which spark-submits the executor, putting the jar on the driver classpath via `--jars` and
`extraClassPath`) and **workflowmanager** (which serves the operations catalog to the editor). The
catalog is a `lazy val` computed once at start-up, so **both must be restarted**:

```bash
docker compose restart workflowmanager sessionmanager
```

Then hard-reload the editor (Ctrl+Shift+R) — the Angular `OperationsService` fetches the catalog
once and freezes it, so a soft reload can keep serving the old palette.

Copy only the plugin jar, not the `-tests.jar` sbt also produces: it holds the dev utilities below
and has no place on the Spark driver classpath.

## Verifying without a cluster

```bash
sbt "customops/Test/runMain ai.deepsense.customops.DumpGeneratedCode /tmp/gen"
python3 customops/src/test/python/check_generated_code.py /tmp/gen

sbt "customops/Test/runMain ai.deepsense.customops.CatalogSmokeTest <deploy>/jars"
```

`DumpGeneratedCode` renders exactly what execution submits, for all three operations — it goes
through the same `PythonShim.assemble` path, so the check is not testing a parallel copy. `check_generated_code.py` fakes pyspark and asserts that `code_executor.py`'s
`isValid` accepts each script and that every return shape above converts as documented, including
the refused ambiguity and each error message.

`CatalogSmokeTest` loads the packaged jar through `CatalogRecorder` the way the running system does
and asserts all three operations land in the plugin's category, that their ports and parameters
are as expected,
that nothing leaks into `User defined` (which would mean a stray `@Register`), and that `code` is
the only parameter. Operation and category names are read from the classes, so renaming them in the
palette does not break the check — but a name with a double space or stray whitespace is rejected,
since those are invisible in the palette.

`check_with_real_mlflow.py` is the end-to-end one: real sklearn, real MLflow, a live SQLite
tracking store. It trains a model, calls the injected `save_model()`, feeds the published record to
the generated push script, then reads the run back **out of MLflow** — metrics, params, artifacts,
registry version — and loads the model with `mlflow.pyfunc` to prove it round-trips. Run it in the
session container; the file header has the commands.

`check_with_real_pandas.py` covers what a faked pandas cannot: a returned Series, numpy arrays, and
the guard that stops pandas/numpy objects being scraped as rows. It needs real pandas, so it runs
in the session container — the header of the file has the commands.
