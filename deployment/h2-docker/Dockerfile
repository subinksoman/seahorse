# Copyright (c) 2016, CodiLime Inc.
# Base modernized: anapsix/alpine-java:jre8 is abandoned — a 2016-era Alpine 3.4 that carries
# 14 CRITICAL + 36 HIGH OS CVEs (libssl/libcrypto 1.0.2h, musl 1.1.14, zlib 1.2.8, ncurses 6.0).
# eclipse-temurin:17-jre-alpine is a maintained JRE 17 on current Alpine, which clears them.
# H2 stays 1.4.192 on purpose: its on-disk DB format and TCP wire protocol must match the backend
# services' bundled h2-1.4.191 client and the existing h2-data volume. H2's own two criticals
# (CVE-2021-42392, CVE-2022-23221) are only fixed in H2 2.x — a breaking change that would require
# migrating every service driver + every database file (a coordinated backend-wide effort, not an
# image fix). They are also not reachable in this deployment: the TCP Server runs WITHOUT the web
# Console (-tcp only) and every JDBC URL is fixed in docker-compose (no attacker-controlled URL/INIT).
FROM eclipse-temurin:17-jre-alpine

# Patch any remaining Alpine packages to their latest security releases.
RUN apk --no-cache upgrade

ENV H2_VERSION 1.4.192
ENV DATA_DIR /opt/h2-data

# The h2 jar is vendored into the build context and COPYed in.
COPY h2-${H2_VERSION}.jar /opt/h2-${H2_VERSION}.jar
RUN mkdir -p ${DATA_DIR}


EXPOSE 1521

CMD java -cp /opt/h2-${H2_VERSION}.jar org.h2.tools.Server \
        -tcp -tcpAllowOthers -tcpPort 1521 \
        -baseDir ${DATA_DIR}
