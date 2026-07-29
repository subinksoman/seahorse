# Copyright (c) 2016, CodiLime Inc.
FROM anapsix/alpine-java:jre8

ENV H2_VERSION 1.4.192
ENV DATA_DIR /opt/h2-data

# The h2 jar is vendored into the build context and COPYed in: the ancient
# anapsix/alpine-java:jre8 base's wget can no longer negotiate TLS with repo1.maven.org
# (immediate "Connection reset by peer"), so the download is done on the host instead.
COPY h2-${H2_VERSION}.jar /opt/h2-${H2_VERSION}.jar
RUN mkdir -p ${DATA_DIR}


EXPOSE 1521

CMD java -cp /opt/h2-${H2_VERSION}.jar org.h2.tools.Server \
        -tcp -tcpAllowOthers -tcpPort 1521 \
        -baseDir ${DATA_DIR}
