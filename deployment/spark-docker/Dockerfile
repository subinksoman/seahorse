# Copyright (c) 2016, CodiLime Inc.
FROM ubuntu:24.04
ARG SPARK_VERSION
ARG HADOOP_VERSION

# Install packages
RUN sed -i 's/archive.ubuntu.com/kr.archive.ubuntu.com/g' /etc/apt/sources.list
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
    build-essential \
    openjdk-17-jre \
    wget \
    curl \
    bzip2 \
    openssh-server \
    openssh-client \
    libsm6 \
    libcurl4-openssl-dev \
    libssl-dev \
    gfortran \
    liblapack-dev \
    liblapack3 \
    libopenblas-dev \
    krb5-user \
    r-base \
    && apt-get clean \
    && apt-get autoremove \
    && rm -rf /var/lib/apt/lists/*

# R custom-code executor: r_executor.R runs via Rscript (r-base above) and loads SparkR
# from $SPARK_HOME/R/lib (shipped in the Spark 3.4.4 binary tarball). It installs any extra
# R packages into /opt/R_Libs (its first .libPaths() entry) — create it so the mount/write works.
RUN mkdir -p /opt/R_Libs

# Setup passwordless SSH
RUN ssh-keygen -q -N "" -t rsa -f /root/.ssh/id_rsa
RUN cp /root/.ssh/id_rsa.pub /root/.ssh/authorized_keys

# Install Spark. Use the Scala 2.13 distribution: the whole project is built with Scala
# 2.13, so the workflow-executor (we.jar) carries the 2.13 Scala library. The default
# spark-<ver>-bin-hadoop<h>.tgz is Scala 2.12 and mixing it with a 2.13 executor throws
# at runtime (NoSuchMethodError scala.util.matching.Regex.<init>(String, scala.collection.Seq)
# in org.apache.spark.util.Utils$.<init> — the 2.12 vs 2.13 Seq/varargs signature change).
# SPARK_HOME stays /opt/spark-<ver>; only the extracted package dir carries the -scala2.13 suffix.
ENV SPARK_PACKAGE=spark-$SPARK_VERSION-bin-hadoop$HADOOP_VERSION-scala2.13
ENV SPARK_HOME=/opt/spark-$SPARK_VERSION
ENV PATH=$PATH:$SPARK_HOME/bin
ENV LOG4J2_VERSION=2.17.2
# Install Spark, then in the SAME layer strip the vulnerable Log4j 1.x jars that
# stock Spark 3.0.0 bundles and replace them with Log4j 2 ($LOG4J2_VERSION, to
# match the JVM services). The log4j-1.2-api bridge routes Spark's Log4j 1.x API
# calls onto the Log4j 2 backend. Finally write a native log4j2.properties that
# mirrors Spark 3.0.0's default console logging so output is unchanged after the
# swap (single-quoted echoes keep the %-conversion pattern literal).
RUN wget -O - \
  "https://archive.apache.org/dist/spark/spark-$SPARK_VERSION/$SPARK_PACKAGE.tgz" \
  | tar -xz -C /tmp/ \
  && mv /tmp/$SPARK_PACKAGE $SPARK_HOME \
  && rm -rf $SPARK_HOME/examples $SPARK_HOME/ec2 \
  && rm -rf $SPARK_HOME/lib/spark-examples*.jar \
  && rm -f $SPARK_HOME/jars/log4j-1.2*.jar $SPARK_HOME/jars/slf4j-log4j12-*.jar \
  && for m in log4j-api log4j-core log4j-slf4j-impl log4j-1.2-api; do \
       wget -q "https://repo1.maven.org/maven2/org/apache/logging/log4j/$m/$LOG4J2_VERSION/$m-$LOG4J2_VERSION.jar" -P $SPARK_HOME/jars/; \
     done \
  && { \
       echo 'rootLogger.level = info'; \
       echo 'rootLogger.appenderRef.stdout.ref = console'; \
       echo 'appender.console.type = Console'; \
       echo 'appender.console.name = console'; \
       echo 'appender.console.target = SYSTEM_ERR'; \
       echo 'appender.console.layout.type = PatternLayout'; \
       echo 'appender.console.layout.pattern = %d{yy/MM/dd HH:mm:ss} %p %c{1}: %m%n'; \
       echo 'logger.repl.name = org.apache.spark.repl.Main'; \
       echo 'logger.repl.level = warn'; \
       echo 'logger.jetty1.name = org.sparkproject.jetty'; \
       echo 'logger.jetty1.level = warn'; \
       echo 'logger.jetty2.name = org.sparkproject.jetty.util.component.AbstractLifeCycle'; \
       echo 'logger.jetty2.level = error'; \
       echo 'logger.parquet1.name = org.apache.parquet'; \
       echo 'logger.parquet1.level = error'; \
       echo 'logger.parquet2.name = parquet'; \
       echo 'logger.parquet2.level = error'; \
       echo 'logger.hive1.name = org.apache.hadoop.hive.metastore.RetryingHMSHandler'; \
       echo 'logger.hive1.level = fatal'; \
       echo 'logger.hive2.name = org.apache.hadoop.hive.ql.exec.FunctionRegistry'; \
       echo 'logger.hive2.level = error'; \
     } > $SPARK_HOME/conf/log4j2.properties

#COPY rdd.py /opt/spark-2.1.1/python/pyspark/

# Install Miniconda with Python 3.12
RUN wget -q -O /tmp/Miniconda3-py312-Linux-x86_64.sh \
    https://repo.anaconda.com/miniconda/Miniconda3-py312_24.9.2-0-Linux-x86_64.sh && \
    bash /tmp/Miniconda3-py312-Linux-x86_64.sh -f -b -p /opt/conda && \
    rm /tmp/Miniconda3-py312-Linux-x86_64.sh

# Configure conda channels
RUN /opt/conda/bin/conda config --add channels conda-forge

# Copy requirements.txt
COPY requirements.txt /tmp/requirements.txt

# Copy spark-defaults.conf


COPY spark-defaults.conf $SPARK_HOME/conf/spark-defaults.conf

# Remove bundled Arrow JARs to force use of newer version from packages
# Arrow JAR deletion reverted - using bundled Arrow 0.15.1 compatible with Spark 3.0.0


# Install Python packages
RUN /opt/conda/bin/pip install -r /tmp/requirements.txt && \
    rm /tmp/requirements.txt

#COPY paths.py /opt/conda/lib/python3.7/site-packages/jupyter_core/
ENV PATH=$PATH:/opt/conda/bin

# JDK 17: Spark reflects into JDK internals blocked by the module system; mirror Spark 3.4's
# JavaModuleOptions so spark-submit/executors run on the openjdk-17 runtime.
ENV JDK_JAVA_OPTIONS="--add-opens=java.base/java.lang=ALL-UNNAMED --add-opens=java.base/java.lang.invoke=ALL-UNNAMED --add-opens=java.base/java.lang.reflect=ALL-UNNAMED --add-opens=java.base/java.io=ALL-UNNAMED --add-opens=java.base/java.net=ALL-UNNAMED --add-opens=java.base/java.nio=ALL-UNNAMED --add-opens=java.base/java.util=ALL-UNNAMED --add-opens=java.base/java.util.concurrent=ALL-UNNAMED --add-opens=java.base/java.util.concurrent.atomic=ALL-UNNAMED --add-opens=java.base/sun.nio.ch=ALL-UNNAMED --add-opens=java.base/sun.nio.cs=ALL-UNNAMED --add-opens=java.base/sun.security.action=ALL-UNNAMED --add-opens=java.base/sun.util.calendar=ALL-UNNAMED --add-opens=java.security.jgss/sun.security.krb5=ALL-UNNAMED -Dio.netty.tryReflectionSetAccessible=true"

COPY startup.sh /opt/
RUN chown root.root /opt/startup.sh && chmod 700 /opt/startup.sh

ENTRYPOINT [ "/opt/startup.sh" ]
CMD [ "-d" ]

