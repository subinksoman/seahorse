#!/bin/sh -ex
# Copyright 2016 deepsense.ai (CodiLime, Inc)
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


SPARK_VERSION=$1
HADOOP_VERSION=$2

# Package name differs by Spark major (matches deployment/spark-docker/Dockerfile):
#   * Spark 4.x is Scala 2.13 ONLY -> spark-<ver>-bin-hadoop<h>.tgz (no -scala2.13 suffix).
#   * Spark <= 3.4.x ships both -> use the -scala2.13 variant (the executor is Scala 2.13).
case "$SPARK_VERSION" in
  4.*) NAME=spark-$SPARK_VERSION-bin-hadoop$HADOOP_VERSION ;;
  *)   NAME=spark-$SPARK_VERSION-bin-hadoop$HADOOP_VERSION-scala2.13 ;;
esac

ARCHIVE_FILE=$NAME.tgz
TARGET_DIR=/opt

# download spark: archive primary + dlcdn CDN fallback, with timeouts so a dead/slow mirror
# fails over instead of hanging.
wget --continue --timeout=30 --tries=2 "http://archive.apache.org/dist/spark/spark-$SPARK_VERSION/$ARCHIVE_FILE" \
  || wget --continue --timeout=30 --tries=2 "https://dlcdn.apache.org/spark/spark-$SPARK_VERSION/$ARCHIVE_FILE"

# extract to /opt
tar -xvzf $ARCHIVE_FILE -C $TARGET_DIR

# create symbolic link
ln -s $TARGET_DIR/$NAME $TARGET_DIR/spark

# delete downloaded archive
rm $ARCHIVE_FILE
