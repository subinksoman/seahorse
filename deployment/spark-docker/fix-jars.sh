#!/usr/bin/env bash
# T92 security: replace vulnerable jars bundled in the Spark distribution ($SPARK_HOME/jars) with
# patched versions from Maven Central. Only patch/compatible bumps are done here (netty stays on the
# 4.2.x line, jackson on 2.21.x) so Spark's runtime is not disturbed. Jars with no compatible fixed
# version (derby -> needs JDK21, jetty -> needs Jetty 10+) are intentionally left for Trivy to report.
set -u
cd "$SPARK_HOME/jars" 2>/dev/null || { echo "no jars dir"; exit 0; }
M=https://repo1.maven.org/maven2

# Generic swap: <maven-group-path> <artifact> <oldver> <newver>. Preserves any classifier suffix
# (e.g. netty native -linux-x86_64) present on the installed file.
swap() {
  local grp="$1" art="$2" old="$3" new="$4" f suf url
  for f in ${art}-${old}*.jar; do
    [ -e "$f" ] || continue
    suf="${f#${art}-${old}}"; suf="${suf%.jar}"
    url="$M/$grp/$art/$new/${art}-${new}${suf}.jar"
    if wget -q --tries=3 --timeout=30 "$url" -O "${art}-${new}${suf}.jar"; then
      rm -f "$f"; echo "  swapped $f -> ${art}-${new}${suf}.jar"
    else
      rm -f "${art}-${new}${suf}.jar"; echo "  KEEP $f (no $new on Maven)"
    fi
  done
}

echo "== netty 4.2.13 -> 4.2.16 =="
for f in netty-*-4.2.13.Final*.jar; do
  [ -e "$f" ] || continue
  base="${f%-4.2.13.Final*}"; rest="${f#${base}-4.2.13.Final}"; rest="${rest%.jar}"
  url="$M/io/netty/${base}/4.2.16.Final/${base}-4.2.16.Final${rest}.jar"
  if wget -q --tries=3 --timeout=30 "$url" -O "${base}-4.2.16.Final${rest}.jar"; then
    rm -f "$f"; echo "  swapped $f"
  else
    rm -f "${base}-4.2.16.Final${rest}.jar"; echo "  KEEP $f"
  fi
done

echo "== jackson 2.21.2 -> 2.21.4 =="
swap com/fasterxml/jackson/core jackson-core 2.21.2 2.21.4
swap com/fasterxml/jackson/core jackson-databind 2.21.2 2.21.4
swap com/fasterxml/jackson/core jackson-annotations 2.21 2.21.4
swap com/fasterxml/jackson/dataformat jackson-dataformat-yaml 2.21.2 2.21.4
swap com/fasterxml/jackson/dataformat jackson-dataformat-cbor 2.21.2 2.21.4
swap com/fasterxml/jackson/datatype jackson-datatype-jsr310 2.21.2 2.21.4
swap com/fasterxml/jackson/module jackson-module-scala_2.13 2.21.2 2.21.4

echo "== peripheral low-risk jars =="
swap com/google/code/gson gson 2.6.1 2.10.1
swap commons-io/commons-io commons-io 2.4 2.16.1
swap org/json json 20210307 20240303
swap org/slf4j slf4j-ext 1.7.12 1.7.36

# derby is Spark's bundled embedded-Hive-metastore jar (CVE-2022-46337). Seahorse configures no Hive
# catalog (spark.sql.catalogImplementation defaults to in-memory), so derby is never exercised, and
# the fixed line (10.17.x) needs JDK 21. Remove it — nothing on the classpath references it.
echo "== remove unused derby (in-memory catalog; no Hive metastore) =="
rm -f derby*.jar derbytools*.jar derbyshared*.jar derbyclient*.jar derbynet*.jar && echo "  removed derby jars"

echo "== done =="
