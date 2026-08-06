# Copyright (c) 2016, CodiLime Inc.
# eclipse-temurin:17-jre-alpine: maintained JRE 17 on current Alpine (the old anapsix/alpine-java:jre8
# base was a 2016 Alpine 3.4 carrying 14C/36H OS CVEs).
# H2 upgraded to 2.x: fixes CVE-2021-42392 + CVE-2022-23221 (only patched in the 2.x line). The backend
# services' bundled H2 driver is upgraded in lockstep. H2 2.x disables remote database creation over TCP
# by default, so -ifNotExists is required for the managers to create their per-service DBs on first run.
FROM eclipse-temurin:17-jre-alpine

# Patch any remaining Alpine packages to their latest security releases.
RUN apk --no-cache upgrade

ENV H2_VERSION 2.2.224
ENV DATA_DIR /opt/h2-data

# The h2 jar is vendored into the build context and COPYed in.
COPY h2-${H2_VERSION}.jar /opt/h2-${H2_VERSION}.jar
RUN mkdir -p ${DATA_DIR}


EXPOSE 1521

CMD java -cp /opt/h2-${H2_VERSION}.jar org.h2.tools.Server \
        -tcp -tcpAllowOthers -tcpPort 1521 -ifNotExists \
        -baseDir ${DATA_DIR}
