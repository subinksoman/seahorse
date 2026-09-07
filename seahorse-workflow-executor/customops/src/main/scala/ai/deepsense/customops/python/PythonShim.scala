/**
 * Copyright 2026 6D Technologies
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package ai.deepsense.customops.python

/**
 * Shared plumbing for the multi-port Python operations.
 *
 * The session's Python side (`pyexecutor/code_executor.py`) only ever calls a single-argument
 * `transform` and only ever moves one DataFrame in (port 0) and one out (port 0). Extra ports
 * therefore travel as **global** temporary views: the Python side runs in
 * `sparkSession.newSession()`, which shares `SharedState` — and so the `global_temp` database —
 * with the JVM session, but not ordinary temp views.
 *
 * `conversionHelpers` is the Python that turns whatever the user's `transform` returned into a
 * Spark DataFrame; each operation appends its own `transform(dataframe)` entry point.
 *
 * The generated Python uses `#` comments and never docstrings: `conversionHelpers` is a plain
 * (non-interpolated) Scala triple-quoted string, which does NOT process `\"` escapes, so a
 * `"""` docstring would reach the interpreter with its backslashes intact and fail to parse.
 */
private[customops] object PythonShim {

  val InputPortNumber: Int = 0

  val OutputPortNumber: Int = 0

  /** A global temp view name unique to one node and role, stable across re-runs of that node. */
  def viewName(nodeId: String, role: String): String =
    s"seahorse_py_${role}_" + nodeId.replaceAll("[^0-9a-zA-Z]", "_")

  /** The view carrying input port 1 into Python. */
  def rightInputView(nodeId: String): String = viewName(nodeId, "in1")

  /** The views carrying output ports 1..n back out of Python, in port order. */
  def extraOutputViews(nodeId: String, count: Int): Seq[String] =
    (1 to count).map(i => viewName(nodeId, s"out$i"))

  /** The view carrying the saved-model record back out of Python. */
  def modelView(nodeId: String): String = viewName(nodeId, "model")

  /**
   * MLflow moves artifacts from the *client*, so an S3 or MinIO artifact root needs credentials in
   * the executor's own environment — for downloads as much as uploads. Failing that, boto3 raises
   * `NoCredentialsError` under a ~60-frame stack that says nothing about what to do.
   */
  val artifactErrorHelper: String =
    """
      |def _sh_artifact_error(error, action="moving the model"):
      |    name = type(error).__name__
      |    detail = name + ": " + str(error)
      |    text = (name + " " + str(error)).lower()
      |    prefix = "MLflow reached the tracking server, but " + action + " failed"
      |
      |    if "nocredentials" in text or "unable to locate credentials" in text:
      |        return (
      |            prefix + " because the artifact store is S3-backed and this executor has no "
      |            "credentials. MLflow moves artifacts from the client, not through the tracking "
      |            "server, so set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (plus "
      |            "AWS_DEFAULT_REGION, and MLFLOW_S3_ENDPOINT_URL for MinIO) in the "
      |            "environment of the container running the executor. Alternatively run the "
      |            "tracking server with --serve-artifacts and an mlflow-artifacts:/ root, and "
      |            "the client needs no S3 access at all. [" + detail + "]")
      |    if "accessdenied" in text or "403" in text:
      |        return (
      |            prefix + " because the artifact store refused access. The credentials in the "
      |            "executor's environment lack permission on the bucket behind this model's "
      |            "artifact root. [" + detail + "]")
      |    if "nosuchbucket" in text:
      |        return (
      |            prefix + " because the bucket behind this model's artifact root does not "
      |            "exist. [" + detail + "]")
      |    if "endpointconnectionerror" in text or "could not connect" in text:
      |        return (
      |            prefix + " because the artifact store could not be reached. Check "
      |            "MLFLOW_S3_ENDPOINT_URL in the executor's environment and that the store is "
      |            "reachable from its network. [" + detail + "]")
      |    if "no module named" in text and "boto" in text:
      |        return (
      |            prefix + " because the artifact store is S3-backed but boto3 is not installed "
      |            "in the session's Python interpreter. [" + detail + "]")
      |    return prefix + ". [" + detail + "]"
      |""".stripMargin

  /**
   * Turns whatever a model returned into columns appended to the scored frame. Shared so the
   * two scoring paths — a model port through `Transform`, and `MLflow Predict` — behave alike.
   */
  val predictHelper: String =
    """
      |def _sh_model_input(model, frame):
      |    # If the model recorded a signature, score exactly the columns it declares. The frame
      |    # being scored usually still carries the label and id columns, and without this the
      |    # underlying library rejects it outright.
      |    try:
      |        schema = model.metadata.get_input_schema()
      |    except Exception:
      |        schema = None
      |    if schema is None:
      |        return frame, None
      |    try:
      |        names = [n for n in schema.input_names() if n is not None]
      |    except Exception:
      |        return frame, None
      |    missing = [n for n in names if n not in frame.columns]
      |    if missing:
      |        raise Exception(
      |            "The input is missing column(s) the model needs: " + ", ".join(missing)
      |            + ". The model was trained on: " + ", ".join(names) + ".")
      |    return frame[names], names
      |
      |
      |def _sh_predictions_frame(raw, column="prediction"):
      |    # Just the predictions, named without asking: one output column becomes `prediction`,
      |    # several become prediction_0, prediction_1, ...
      |    import pandas as pd
      |    predictions = pd.DataFrame(raw).reset_index(drop=True)
      |    if predictions.shape[1] == 1:
      |        predictions.columns = [column]
      |    else:
      |        predictions.columns = [
      |            column + "_" + str(index) for index in range(predictions.shape[1])]
      |    return predictions
      |
      |
      |def _sh_attach_predictions(frame, raw, column="prediction"):
      |    import pandas as pd
      |    predictions = pd.DataFrame(raw).reset_index(drop=True)
      |    result = frame.reset_index(drop=True)
      |    if predictions.shape[1] == 1:
      |        result[column] = predictions.iloc[:, 0].values
      |    else:
      |        for index in range(predictions.shape[1]):
      |            result[column + "_" + str(index)] = predictions.iloc[:, index].values
      |    return result
      |
      |
      |def _sh_predict_error(error, declared):
      |    text = str(error).lower()
      |    if "feature names" in text or "columns are missing" in text or "unseen" in text:
      |        hint = (" The model has no recorded signature, so it cannot select its own "
      |                "columns: drop the label and id columns before this node, or re-train "
      |                "passing input_example= to save_model() so a signature is stored.")
      |        if declared:
      |            hint = " The model declares: " + ", ".join(declared) + "."
      |        return ("The model could not score this DataFrame (" + str(error).splitlines()[0]
      |                + ")." + hint)
      |    return "The model could not score this DataFrame (" + str(error) + ")."
      |""".stripMargin

  /** Captures and arity-checks the user's `transform`; only for operations that take code. */
  val userCodeGuards: String =
    """
      |if "transform" not in dir():
      |    raise Exception(
      |        "The code must define a top-level function named `transform`.")
      |
      |_sh_user_transform = transform
      |
      |
      |def _sh_check_arity(fn, expected, signature):
      |    import inspect
      |    try:
      |        params = inspect.signature(fn).parameters
      |    except (TypeError, ValueError):
      |        return
      |    positional = [
      |        p for p in params.values()
      |        if p.kind in (p.POSITIONAL_ONLY, p.POSITIONAL_OR_KEYWORD)
      |    ]
      |    takes_varargs = any(p.kind == p.VAR_POSITIONAL for p in params.values())
      |    if not takes_varargs and len(positional) != expected:
      |        raise Exception(
      |            "This operation calls `" + signature + "`, so `transform` must take exactly "
      |            + str(expected) + " argument(s), but it takes " + str(len(positional)) + ".")
      |""".stripMargin

  /** A Python string literal, or `None`. Operation parameters reach the script through this. */
  def stringLiteral(value: Option[String]): String = value match {
    case None => "None"
    case Some(v) =>
      "\"" + v
        .replace("\\", "\\\\")
        .replace("\"", "\\\"")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\t", "\\t") + "\""
  }

  /**
   * The complete script submitted to the session: the user's code, the shared conversion helpers,
   * the view names this node uses, and the operation's `transform(dataframe)` entry point. One
   * rendering path, so `DumpGeneratedCode` checks exactly what execution runs.
   */
  def assemble(
      userCode: Option[String],
      rightInputView: Option[String],
      extraOutputViews: Seq[String],
      model: Option[ModelCapture],
      entryPoint: String): String = {
    val viewList = extraOutputViews.map(v => "\"" + v + "\"").mkString("[", ", ", "]")
    val rightView = rightInputView.map(v => "\"global_temp." + v + "\"").getOrElse("None")
    val preamble = userCode
      .map(code => code + "\n\n" + conversionHelpers + userCodeGuards)
      .getOrElse(conversionHelpers)
    val modelSection = model.map { capture =>
      s"""
         |_sh_model_view = ${stringLiteral(Some(capture.viewName))}
         |_SH_WORKFLOW_ID = ${stringLiteral(Some(capture.workflowId))}
         |_SH_NODE_ID = ${stringLiteral(Some(capture.nodeId))}
         |""".stripMargin + saveModelHelpers
    }.getOrElse("")
    preamble +
      s"""
         |_sh_right_view = $rightView
         |_sh_extra_out_views = $viewList
         |""".stripMargin + modelSection + entryPoint
  }

  /** Identifies where a node's `save_model()` output is written and handed back. */
  case class ModelCapture(workflowId: String, nodeId: String, viewName: String)

  /**
   * `save_model()` is injected into the user's namespace so training code never touches MLflow's
   * API: it picks the directory, detects the flavour, and records what a downstream node needs.
   * Code that does not call it simply leaves the model port empty.
   *
   * The directory lives under SEAHORSE_MODEL_DIR (default `/library/seahorse-models`, which is
   * mounted read-write and shared with the notebook and library services), keyed by workflow and
   * node so re-running a node replaces only its own model.
   */
  val saveModelHelpers: String =
    """
      |_sh_model_record = {}
      |
      |# module prefix -> mlflow flavour module that can save it
      |_SH_FLAVORS = (
      |    ("sklearn", "sklearn"),
      |    ("xgboost", "xgboost"),
      |    ("lightgbm", "lightgbm"),
      |    ("catboost", "catboost"),
      |    ("statsmodels", "statsmodels"),
      |    ("torch", "pytorch"),
      |    ("keras", "tensorflow"),
      |    ("tensorflow", "tensorflow"),
      |    ("pyspark", "spark"),
      |    ("prophet", "prophet"),
      |)
      |
      |
      |def _sh_model_dir():
      |    import os
      |    base = os.environ.get("SEAHORSE_MODEL_DIR", "/library/seahorse-models")
      |    return os.path.join(base, _SH_WORKFLOW_ID, _SH_NODE_ID)
      |
      |
      |def _sh_detect_flavor(model):
      |    root = (type(model).__module__ or "").split(".")[0]
      |    for prefix, flavor in _SH_FLAVORS:
      |        if root == prefix:
      |            return flavor
      |    return None
      |
      |
      |def _sh_check_fitted(model):
      |    # MLflow will happily save an UNFITTED estimator, write a valid MLmodel and even let it
      |    # be registered; the failure only surfaces much later, at predict time, as
      |    # NotFittedError. Catch it at save time instead of shipping a model that cannot score.
      |    try:
      |        from sklearn.exceptions import NotFittedError
      |        from sklearn.utils.validation import check_is_fitted
      |    except ImportError:
      |        return
      |    try:
      |        check_is_fitted(model)
      |    except NotFittedError:
      |        raise Exception(
      |            "This " + type(model).__name__ + " has not been fitted, so saving it would put "
      |            "a model that cannot predict into MLflow. Call model.fit(X, y) before "
      |            "save_model().")
      |    except Exception:
      |        return          # check_is_fitted only understands sklearn-style estimators
      |
      |
      |def _sh_any_model(model):
      |    # Wrap an arbitrary object as a pyfunc model, so the artifact is still a real MLflow
      |    # model directory. That matters: registering and the Transform node both require an
      |    # MLmodel file. MLflow cloudpickles this class by value, so it does not need to be
      |    # importable when the model is loaded back.
      |    import mlflow
      |    import pandas
      |
      |    class _ShAnyModel(mlflow.pyfunc.PythonModel):
      |        def __init__(self, wrapped):
      |            self.wrapped = wrapped
      |
      |        # The annotation matters: without it MLflow 3 warns on every class definition, and
      |        # the caretaker logs the executor's stderr as ERROR. It also switches on MLflow's
      |        # input validation and signature inference.
      |        def predict(self, context, model_input: pandas.DataFrame, params=None) -> list:
      |            predict = getattr(self.wrapped, "predict", None)
      |            if predict is None:
      |                raise Exception(
      |                    "The saved object (" + type(self.wrapped).__name__ + ") has no "
      |                    "predict(), so it cannot score a DataFrame. It is stored and can be "
      |                    "registered, but do not wire it into a Transform node.")
      |            return predict(model_input)
      |
      |    return _ShAnyModel(model)
      |
      |
      |def _sh_signature(model, input_example):
      |    # A recorded signature is what makes the model tolerant of extra columns later: MLflow
      |    # selects the declared inputs itself. Without one, sklearn rejects any frame whose
      |    # columns differ from training - which is the usual case, since the table you score
      |    # still carries the label and id columns.
      |    if input_example is None:
      |        return None
      |    try:
      |        from mlflow.models import infer_signature
      |    except ImportError:
      |        return None
      |    try:
      |        predict = getattr(model, "predict", None)
      |        output = predict(input_example) if predict is not None else None
      |        return infer_signature(input_example, output)
      |    except Exception:
      |        # A signature is an optimisation, never a reason to lose a trained model.
      |        try:
      |            return infer_signature(input_example)
      |        except Exception:
      |            return None
      |
      |
      |def save_model(model, metrics=None, params=None, flavor=None, path=None,
      |               input_example=None):
      |    # Saves the model where the next node can read it, and records it for the model port.
      |    import os
      |    import shutil
      |    try:
      |        import mlflow
      |    except ImportError as error:
      |        raise Exception(
      |            "save_model() needs MLflow, which is not installed in the session's Python "
      |            "interpreter (" + str(error) + ").")
      |
      |    _sh_check_fitted(model)
      |
      |    # A recognised framework gets its own flavour, which preserves the most fidelity.
      |    # Anything else - a custom class, a wrapper, a pipeline of your own - is stored through
      |    # pyfunc, so save_model() accepts any object.
      |    resolved = flavor or _sh_detect_flavor(model) or "pyfunc"
      |    module = getattr(mlflow, resolved, None)
      |    if module is None or not hasattr(module, "save_model"):
      |        raise Exception(
      |            "This MLflow install has no '" + resolved + "' flavour with save_model.")
      |
      |    target = str(path) if path else _sh_model_dir()
      |    parent = os.path.dirname(target)
      |    if parent:
      |        try:
      |            os.makedirs(parent, exist_ok=True)
      |        except OSError as error:
      |            raise Exception(
      |                "Cannot create '" + parent + "' to save the model into (" + str(error)
      |                + "). Set SEAHORSE_MODEL_DIR to a directory the session container can "
      |                "write to, or pass path= to save_model().")
      |    shutil.rmtree(target, ignore_errors=True)    # save_model refuses an existing directory
      |    signature = _sh_signature(model, input_example)
      |    if resolved == "pyfunc":
      |        module.save_model(
      |            path=target, python_model=_sh_any_model(model), signature=signature)
      |    else:
      |        module.save_model(model, target, signature=signature)
      |
      |    _sh_model_record.clear()
      |    _sh_model_record.update({
      |        "model_path": target,
      |        "flavor": resolved,
      |        "metrics": dict(metrics or {}),
      |        "params": dict(params or {}),
      |    })
      |    return target
      |
      |
      |def _sh_publish_model(spark):
      |    # Hand the record to the JVM through a global temp view, like any other extra port.
      |    if not _sh_model_record or not _sh_model_view:
      |        return
      |    import json
      |    record = {
      |        "model_path": str(_sh_model_record.get("model_path", "")),
      |        "flavor": str(_sh_model_record.get("flavor", "")),
      |        "metrics_json": json.dumps(_sh_model_record.get("metrics") or {}, default=str),
      |        "params_json": json.dumps(_sh_model_record.get("params") or {}, default=str),
      |    }
      |    _sh_to_spark_dataframe(
      |        [record], spark, "the saved model record"
      |    ).createOrReplaceGlobalTempView(_sh_model_view)
      |""".stripMargin

  val conversionHelpers: String =
    """
      |# --- generated by the SixDee Python transformations - do not edit ---
      |import dataclasses as _sh_dataclasses
      |import datetime as _sh_datetime
      |import decimal as _sh_decimal
      |
      |# Advice appended to every "cannot build a DataFrame" failure: the schema is expressible in
      |# the user's own code, so the operation needs no schema parameter.
      |_SH_HINT = (
      |    " To control the schema yourself, return a Spark DataFrame instead of a list, e.g. "
      |    "`spark.createDataFrame(rows, \"id INT, name STRING\")`."
      |)
      |
      |
      |_sh_ATOMIC = (
      |    bool, int, float, str, bytes, bytearray,
      |    _sh_decimal.Decimal, _sh_datetime.date, _sh_datetime.datetime, _sh_datetime.time,
      |)
      |
      |
      |def _sh_is_data_library_object(obj):
      |    # pandas / numpy objects carry their data privately: they are columns and arrays, not
      |    # row objects, and must never go down the attribute-scraping path below.
      |    return (type(obj).__module__ or "").split(".")[0] in ("pandas", "numpy")
      |
      |
      |def _sh_as_mapping(obj):
      |    # Best-effort field view of one returned object, or None if it is not object-like.
      |    if isinstance(obj, dict):
      |        return dict(obj)
      |    if _sh_is_data_library_object(obj):
      |        return None
      |    if hasattr(obj, "_asdict"):                      # namedtuple, pyspark Row
      |        return dict(obj._asdict())
      |    if _sh_dataclasses.is_dataclass(obj) and not isinstance(obj, type):
      |        return _sh_dataclasses.asdict(obj)
      |    if hasattr(obj, "model_dump"):                   # pydantic v2
      |        return dict(obj.model_dump())
      |    if hasattr(obj, "dict") and callable(getattr(obj, "dict")):   # pydantic v1
      |        return dict(obj.dict())
      |    if isinstance(obj, _sh_ATOMIC):
      |        return None
      |    # Attribute scraping is the last resort, and only counts if it finds a field: an object
      |    # whose state is all private is not a row.
      |    for fields in (
      |        dict((k, v) for k, v in vars(obj).items() if not k.startswith("_"))
      |        if hasattr(obj, "__dict__") else {},
      |        dict((k, getattr(obj, k)) for k in getattr(obj, "__slots__", ())
      |             if not k.startswith("_")),
      |    ):
      |        if fields:
      |            return fields
      |    return None
      |
      |
      |def _sh_series_to_frame(value):
      |    # A pandas Series is a single column of data. Name it explicitly - an unnamed Series
      |    # would give to_frame() the integer column name 0, which Spark will not accept.
      |    try:
      |        import pandas as _sh_pandas
      |    except ImportError:
      |        return None
      |    series_type = getattr(_sh_pandas, "Series", None)
      |    if series_type is None or not isinstance(value, series_type):
      |        return None
      |    name = value.name if value.name is not None else "value"
      |    return value.reset_index(drop=True).to_frame(name=str(name))
      |
      |
      |def _sh_as_sequence(value):
      |    # numpy ndarray / pandas Index -> a plain list of native Python values, so the normal
      |    # list handling below turns 1-D into one column and 2-D into positional columns.
      |    if not _sh_is_data_library_object(value):
      |        return None
      |    tolist = getattr(value, "tolist", None)
      |    if not callable(tolist):
      |        return None
      |    try:
      |        return tolist()
      |    except Exception:
      |        return None
      |
      |
      |def _sh_is_dataframe(value):
      |    from pyspark.sql import DataFrame as _SparkDataFrame
      |    if isinstance(value, _SparkDataFrame):
      |        return True
      |    try:
      |        import pandas as _sh_pandas
      |    except ImportError:
      |        return False
      |    return isinstance(value, _sh_pandas.DataFrame)
      |
      |
      |def _sh_to_spark_value(value):
      |    # Turn nested objects into Rows so they land as structs, lists into arrays.
      |    from pyspark.sql import Row
      |    if value is None or isinstance(value, _sh_ATOMIC):
      |        return value
      |    if isinstance(value, (list, tuple, set)):
      |        return [_sh_to_spark_value(v) for v in value]
      |    nested = _sh_as_sequence(value)
      |    if nested is not None:
      |        return [_sh_to_spark_value(v) for v in nested]
      |    mapping = _sh_as_mapping(value)
      |    if mapping is None:
      |        return value
      |    fields = list(mapping.keys())
      |    if not fields:
      |        return None
      |    return Row(*fields)(*[_sh_to_spark_value(mapping[f]) for f in fields])
      |
      |
      |def _sh_field_order(mappings):
      |    # Union of keys in first-seen order, so column order is stable and predictable.
      |    fields = []
      |    seen = set()
      |    for mapping in mappings:
      |        if mapping is None:
      |            continue
      |        for key in mapping.keys():
      |            if key not in seen:
      |                seen.add(key)
      |                fields.append(key)
      |    return fields
      |
      |
      |def _sh_normalize_column(values):
      |    # Convert one column's values across ALL rows at once, so every row ends up
      |    # structurally identical.
      |    #
      |    # Spark infers a schema from the first row and then applies it to the rest, so a nested
      |    # object with a different key set in a later row makes the row too short for the schema
      |    # (STRUCT_ARRAY_LENGTH_MISMATCH). That surfaces lazily, in whatever downstream stage
      |    # first computes the DataFrame, so it has to be prevented here rather than detected.
      |    from pyspark.sql import Row
      |    values = list(values)
      |    mappings = [_sh_as_mapping(v) for v in values]
      |
      |    if any(mapping is not None for mapping in mappings):
      |        fields = _sh_field_order(mappings)
      |        if not fields:
      |            return [None] * len(values)
      |        columns = dict(
      |            (field, _sh_normalize_column(
      |                [None if m is None else m.get(field) for m in mappings]))
      |            for field in fields)
      |        row_type = Row(*fields)
      |        return [
      |            None if mappings[i] is None
      |            else row_type(*[columns[field][i] for field in fields])
      |            for i in range(len(values))
      |        ]
      |
      |    def as_list(value):
      |        if isinstance(value, (list, tuple, set)):
      |            return list(value)
      |        return _sh_as_sequence(value)
      |
      |    lists = [as_list(v) for v in values]
      |    if any(l is not None for l in lists):
      |        # Normalise the elements of every list together, for the same reason.
      |        flat = [element for l in lists if l is not None for element in l]
      |        converted = iter(_sh_normalize_column(flat)) if flat else iter(())
      |        return [
      |            None if l is None else [next(converted) for _ in l]
      |            for l in lists
      |        ]
      |
      |    return [_sh_to_spark_value(v) for v in values]
      |
      |
      |def _sh_to_dataframe(result, spark, what="`transform`"):
      |    from pyspark.sql import DataFrame as _SparkDataFrame, Row
      |    try:
      |        import pandas as _sh_pandas
      |    except ImportError:
      |        _sh_pandas = None
      |
      |    if isinstance(result, _SparkDataFrame):
      |        return result
      |    if _sh_pandas is not None and isinstance(result, _sh_pandas.DataFrame):
      |        return result
      |
      |    series_frame = _sh_series_to_frame(result)
      |    if series_frame is not None:
      |        return series_frame                          # e.g. `return X, y` where y is a Series
      |
      |    as_sequence = _sh_as_sequence(result)
      |    if as_sequence is not None:
      |        result = as_sequence                         # e.g. a numpy array of predictions
      |
      |    if result is None:
      |        raise Exception(
      |            what + " returned None; return a list of objects instead.")
      |    if isinstance(result, dict) or _sh_as_mapping(result) is not None:
      |        result = [result]                            # a single object is a one-row result
      |    if not isinstance(result, (list, tuple)):
      |        raise Exception(
      |            what + " must be a list of objects, a Spark DataFrame or a pandas DataFrame, "
      |            "but was " + type(result).__name__ + ".")
      |
      |    items = list(result)
      |    if not items:
      |        raise Exception(
      |            what + " was an empty list, so the output columns cannot be inferred."
      |            + _SH_HINT)
      |
      |    mappings = [_sh_as_mapping(item) for item in items]
      |    if all(mapping is not None for mapping in mappings):
      |        fields = _sh_field_order(mappings)
      |        if not fields:
      |            raise Exception(
      |                "The objects in " + what + " (type "
      |                + type(items[0]).__name__ + ") have no readable fields." + _SH_HINT)
      |        columns = dict(
      |            (field, _sh_normalize_column([m.get(field) for m in mappings]))
      |            for field in fields)
      |        row_type = Row(*fields)
      |        rows = [
      |            row_type(*[columns[field][i] for field in fields])
      |            for i in range(len(mappings))
      |        ]
      |    elif all(isinstance(item, (list, tuple)) for item in items):
      |        rows = [tuple(_sh_to_spark_value(v) for v in item) for item in items]
      |    else:
      |        rows = [(_sh_to_spark_value(item),) for item in items]
      |
      |    try:
      |        return spark.createDataFrame(rows)
      |    except Exception as error:
      |        raise Exception(
      |            "Could not build a DataFrame from " + what + " (" + str(error) + "). This "
      |            "usually means a column is all-null or its type varies between rows."
      |            + _SH_HINT)
      |
      |
      |def _sh_to_spark_dataframe(result, spark, what="`transform`"):
      |    # Like _sh_to_dataframe but never returns pandas - the caller needs a real Spark
      |    # DataFrame because it has to publish it as a global temp view.
      |    converted = _sh_to_dataframe(result, spark, what)
      |    from pyspark.sql import DataFrame as _SparkDataFrame
      |    if isinstance(converted, _SparkDataFrame):
      |        return converted
      |    return spark.createDataFrame(converted)
      |
      |
      |def _sh_split_outputs(result, count):
      |    # Split the return value into one value per output port. A list of `count`
      |    # row-objects is genuinely ambiguous - it could equally mean one DataFrame of
      |    # `count` rows - so that case is rejected rather than guessed at.
      |    if not isinstance(result, (list, tuple)):
      |        raise Exception(
      |            "`transform` must return " + str(count) + " values (one per output port), but "
      |            "returned a single " + type(result).__name__ + ".")
      |    values = list(result)
      |    if len(values) != count:
      |        raise Exception(
      |            "`transform` must return exactly " + str(count) + " values (one per output "
      |            "port), but returned " + str(len(values)) + ".")
      |    if all(not _sh_is_dataframe(v) and _sh_as_mapping(v) is not None for v in values):
      |        raise Exception(
      |            "`transform` returned " + str(count) + " row-like objects, which is ambiguous: "
      |            "it could mean " + str(count) + " one-row DataFrames or one DataFrame of "
      |            + str(count) + " rows. Wrap each output in its own list, e.g. "
      |            "`return [row_a], [row_b]`.")
      |    return values
      |""".stripMargin
}
