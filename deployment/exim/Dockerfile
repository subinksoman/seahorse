# Was alpine:3.4 with the alpine *edge* repos bolted on; alpine 3.4 is EOL and the edge
# signing keys now fail apk with "UNTRUSTED signature". Use a current alpine, whose own
# main/community repos carry both exim and tini — no edge-repo hack needed.
FROM alpine:3.20

RUN apk update && apk --no-cache add exim tini && rm -rf /var/cache/apk/*
RUN mkdir -p /var/log/exim && \
touch /var/log/exim/mainlog /var/log/exim/paniclog /var/log/exim/rejectlog && \
chown exim:exim /var/log/exim/*log

COPY exim.conf /etc/exim/

ENTRYPOINT ["/sbin/tini"]

CMD ["/usr/sbin/exim", "-bd", "-q10m"]

EXPOSE 25
