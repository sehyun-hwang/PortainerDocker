#!/bin/bash
set -e

ln -sfv /opt/redis-stack/share/redisinsight/ui/dist/main.*.css /opt/redis-stack/share/redisinsight/ui/dist/main.css
ln -sfv /opt/redis-stack/share/redisinsight/ui/dist/js/bundle.[0-9]*.min.js  /opt/redis-stack/share/redisinsight/ui/dist/js/bundle.number.min.js
sed -i 's="/api/"="/redis-stack/api/"=g; s=rejectUnauthorized:!1=rejectUnauthorized:!1,path:"/redis-stack/socket.io",transports:["websocket"]=g' \
    /opt/redis-stack/share/redisinsight/ui/dist/js/bundle.main.min.js

SERVER_STATIC_CONTENT=true \
BUILD_TYPE=REDIS_STACK \
NODE_ENV=production \
LOG_LEVEL=warning \
STDOUT_LOGGER=true \
APP_FOLDER_NAME=redisinsight \
APP_FOLDER_ABSOLUTE_PATH=/redisinsight \
REDIS_STACK_DATABASE_NAME=Default \
REDIS_STACK_DATABASE_HOST=redis.vpc \
REDIS_STACK_DATABASE_PORT=6379 \
    /opt/redis-stack/nodejs/bin/node /opt/redis-stack/share/redisinsight/api/dist/src/main.js
