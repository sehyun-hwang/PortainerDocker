#!/bin/bash

CONTAINERS="pgadmin portainer stream registry-browser nginx"
echo Containers: $CONTAINERS
echo -n User
whoami

sudo modprobe ip_tables
sleep 10
docker run --rm hello-world
sleep 10

i=1
docker inspect $CONTAINERS --format "{{.Config.CreateCommand}}" | \
tr -d '[]' | while read line; do
    echo $line
    CONTAINER=`echo $CONTAINERS | awk '{print $'$i'}'`
    echo $i $CONTAINER
    
    docker rm -f $CONTAINER && $line
    (( i++ ))
    echo ======================================================
done

docker ps
sleep infinity