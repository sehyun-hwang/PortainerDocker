FROM linuxserver/openssh-server

COPY *.pub /mnt
COPY config.sh .
RUN bash config.sh

ENV PUBLIC_KEY_DIR=/mnt
ENV USER_NAME=nextlab
EXPOSE 2222