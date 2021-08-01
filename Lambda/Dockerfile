FROM alpine
WORKDIR /root

RUN apk add curl 

COPY index.sh /opt/bootstrap
RUN chmod +x /opt/bootstrap

ENTRYPOINT ["/opt/bootstrap"]