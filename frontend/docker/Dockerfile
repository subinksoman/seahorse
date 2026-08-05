# Copyright (c) 2016, CodiLime Inc.
# Alpine base: the Debian nginx image drags in perl / ncurses / util-linux etc. (50+ CRITICAL/HIGH CVEs,
# many with no Debian fix) that are irrelevant to serving static files. nginx-alpine has a tiny package
# set (busybox), eliminating almost all of them. run.sh is pure POSIX sh (eval/echo template render, no
# envsubst) so it runs unchanged on busybox. `apk upgrade` patches the remaining Alpine packages.
FROM nginx:1.31.3-alpine

RUN apk --no-cache upgrade

ENV API_HOST=http://localhost
ENV API_PORT=9080
ENV SOCKETS_ADDRESS=http://localhost:15674/
ENV NOTEBOOKS_HOST=http://localhost:8888
ENV SESSION_POLLING_INTERVAL=5000

COPY dist/ /usr/share/nginx/html
COPY src/config.js.tmpl /tmp/
COPY src/run.sh /tmp/
# COPY preserves the host file mode; ensure the entrypoint is executable
# regardless of the source file's bit (git tracks it 100644).
RUN chmod +x /tmp/run.sh
# Update nginx configuration so it would request browser not to cache index.html
COPY default.conf /etc/nginx/conf.d/

ENTRYPOINT [ "/tmp/run.sh" ]
CMD ["nginx", "-g", "daemon off;"]
