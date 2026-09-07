name := "seahorse-custom-ops"

// Versioned independently of the core build: this is a drop-in plugin with its own release cadence.
// BUMP THIS whenever you build a jar for deployment, so what is running is identifiable.
//
// A bump changes the jar's filename, which means the previous jar is NOT overwritten in
// /resources/jars. Delete the old one. Two versions side by side both register the same operation
// ids, and DOperationsCatalog.registerDOperation throws on a duplicate id — which takes down the
// entire operations catalog, not just this plugin.
version := "1.3.0"

// Thin plugin jar: deeplang and Spark are already on the executor / workflowmanager classpath, so
// nothing is bundled. Spark stays Provided (sbt still puts it on the test classpath, which the
// CatalogSmokeTest needs — building the operable catalog touches Spark ML classes).
// Build with `sbt customops/package` — never `assembly`.
libraryDependencies ++= Dependencies.usedSpark.provided
