# T00 — Spark / MLlib API surface inventory (deeplang)

**Phase:** 0 — Assessment · **Status:** completed · **Method:** static analysis of `seahorse-workflow-executor/deeplang` (741 Scala files, `target/` excluded).

This is the checklist that drives the Spark hops (T22 for 3.5, T41 for 4.0). Each Spark import in deeplang is classified by migration risk. Verify each **High** item against the target Spark version's source before/while migrating.

## 1. Summary

113 distinct `org.apache.spark.*` imports across deeplang, by package:

| Package | Imports | Nature | Risk |
|---|---:|---|---|
| `ml.feature` | 23 | Public feature transformers | Low–Med |
| `sql` / `sql.types` / `sql.functions` | ~25 | Public DataFrame/SQL API | Low–Med |
| `ml.param` / `ml.util` | 16 | Param system + model persistence | **Med–High** |
| `ml.regression` | 8 | Public estimators | Low–Med |
| `ml.classification` | 7 | Public estimators | Low–Med |
| `ml` (root) | 7 | Pipeline/Model/Transformer | Low |
| `ml.clustering` | 3 | KMeans, LDA | Med |
| `ml.evaluation` | 3 | Evaluators | Low |
| `mllib.*` | 5 | **Legacy RDD API** | Med |
| `sql.catalyst.*` / `unsafe.*` | 4 | **Internal (private) APIs** | **High** |
| `ml.tuning` / `ml.recommendation` | 2 | CrossValidator, ALS | Med |

## 2. HIGH risk — internal / private APIs (break silently across versions)

These are not part of Spark's public API contract and have changed across 3.1–4.0. Each needs a concrete replacement or a version-specific shim.

| Symbol | Used for | 3.1→4.0 concern |
|---|---|---|
| `sql.catalyst.util.DateTimeUtils` | date/time conversion | Method signatures changed repeatedly (calendar rebase in 3.0, `SQLDate`/`SQLTimestamp` types); **verify every call site**. |
| `sql.catalyst.expressions.GenericRowWithSchema` | row construction | Internal; prefer public `Row`/`RowFactory`. |
| `sql.catalyst.analysis.NoSuchTableException` | catalog errors | Package/hierarchy churn; catch a public exception instead. |
| `unsafe.types.UTF8String` | string internals | Relatively stable but private; confirm. |
| `sql.execution.datasources.csv.{DataframeToDriverCsvFileWriter, RawCsvRDDToDataframe}` | CSV read/write internals (currently commented, lives in `sparkutilsfeatures/csv3_0`) | **This is exactly why the `csv<ver>` shim exists** — these internal classes are rewritten every Spark minor. New `csv3_5` / `csv4_0` modules (T20, T40) must re-implement against the target's internals. |
| `ml.util.{MLWriter, MLReader}` + `DefaultParamWriter` (referenced in serialization) | model save/load | `private[ml]` internals; model on-disk format and metadata (`sparkVersion`) change → **T23** persistence validation. |

## 3. MEDIUM risk — legacy MLlib (RDD API) & version-sensitive estimators

- **`mllib.linalg.{Vector, Vectors, SparseVector}`** — RDD-based linalg; the `ml`-based `org.apache.spark.ml.linalg` is preferred. Still present in 4.0 but discouraged; watch for implicit conversions between `ml` and `mllib` vectors.
- **`mllib.stat.{Statistics, MultivariateStatisticalSummary}`** — used for column stats; RDD API, maintenance mode.
- **`mllib.evaluation.{BinaryClassificationMetrics, MulticlassMetrics}`** — RDD metrics; still present.
- **`ml.feature.ChiSqSelector`** — deprecated in 3.1.1 in favor of `UnivariateFeatureSelector`; still present in 3.x, **check removal status in 4.0**.
- **`ml.feature.OneHotEncoder` / `OneHotEncoderModel`** — confirm; `OneHotEncoderEstimator` was renamed to `OneHotEncoder` in 3.0 (already on the new name here — good).
- **`ml.clustering.LDA` (`DistributedLDAModel`, `LocalLDAModel`)** — API stable but optimizer defaults/params shifted.
- **`ml.recommendation.ALS`**, **`ml.tuning.{CrossValidator, ParamGridBuilder}`** — stable public API; low-med.

## 4. LOW risk — public estimators & feature transformers

Standard public `ml` API, aliased as `Spark<Name>` throughout deeplang. Expected source-compatible across 3.x → 4.0 (param defaults may shift; covered by golden-output diff in T25/T42):

- **Feature (23):** Binarizer, Bucketizer, ChiSqSelector*, CountVectorizer(+Model), DCT, HashingTF, IDF(+Model), IndexToString, MinMaxScaler(+Model), NGram, Normalizer, OneHotEncoder(+Model), PCA(+Model), PolynomialExpansion, QuantileDiscretizer, RegexTokenizer, StandardScaler(+Model), StopWordsRemover, StringIndexer(+Model), Tokenizer, VectorAssembler, VectorIndexer(+Model), Word2Vec(+Model).
- **Classification (7):** DecisionTree, GBT, LogisticRegression, MultilayerPerceptron, NaiveBayes, RandomForest.
- **Regression (8):** AFTSurvival, DecisionTree, GBT, Isotonic, Linear, RandomForest.
- **Clustering (3):** KMeans, LDA.
- **Evaluation (3):** Multiclass, Regression evaluators.

## 5. Migration checklist (feeds T22 / T41)

1. **[High]** Replace/shim every `sql.catalyst.*` and `unsafe.*` call site with a public equivalent, or isolate into the `sparkutils<ver>` shim.
2. **[High]** Re-implement the CSV internals (`DataframeToDriverCsvFileWriter`, `RawCsvRDDToDataframe`) in `csv3_5` / `csv4_0` against the target's `sql.execution.datasources.csv` — do NOT copy csv3_0 blindly.
3. **[High]** Validate model persistence (`MLWriter`/`MLReader`/`DefaultParamWriter`) and the `sparkVersion` metadata — **T23**.
4. **[Med]** Confirm `ChiSqSelector` still exists in Spark 4.0; plan a switch to `UnivariateFeatureSelector` if removed.
5. **[Med]** Audit `ml`↔`mllib` vector conversions; migrate `mllib.stat`/`mllib.evaluation` call sites if the target drops them.
6. **[Low]** Recompile public estimators; capture param-default drift via the golden-output diff (T25/T42).

> Coverage note: this inventory is import-level. Method-level breakage (changed signatures on retained classes) is only fully surfaced by compiling against the target Spark (T22/T41) — this document scopes *where* to look, not every line that will break.
