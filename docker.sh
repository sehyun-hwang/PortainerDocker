set -eu

#docker ps -aq -f ancestor=linaro/tensorflow-arm-neoverse-n1:2.3.0-eigen | xargs docker rm -f
#docker images --format '{{.Repository}}:{{.Tag}}' | xargs -L1 docker pull
#docker images -f dangling=true -aq | xargs docker rmi

[ -z "$1" ] && echo Container name argument is required && exit 1

echo Container name: $1

# while [ -t 1 ]; do
#     [[ yn =~ $2 ]] && [[ ! -z "$2" ]] && REPLY=$2 || read -p "Remove container $1? (y/n)
# > "
#     case $REPLY in
#         y) docker rm -f $1; break;;
#         n) break;;
#     esac
# done

function Password {
    if [ ! -z $REPLY ]; then
        read -p Password:
    fi
}

ARGS=$2

case $1 in
    dev)
    docker run -it --rm --pod nginx-pod --name dev \
        -w /mnt -v node_modules:/mnt/node_modules -v $PWD:/mnt \
        -v ~/.bash_history:/root/.bash_history:z \
        -v ~/.cache/yarn/v6:/usr/local/share/.cache/yarn/v6 \
        --security-opt label=disable node:alpine sh
    ;;

\
    nginx)
    docker start pgadmin portainer stream registry-browser redisinsight

    docker pod ls -f=status=degraded -q | grep nginx-pod && docker pod rm nginx-pod
    docker pod create --name nginx-pod --net network \
        -p 80:80 -p 443:443/tcp -p 443:443/udp -p 5432:5432 -p 6379:6379 || true

    docker run --name nginx -d $ARGS \
        --restart unless-stopped \
        --pod nginx-pod \
        -v /etc/localtime:/etc/localtime:ro \
        -v cert:/cert:ro \
        -v /mnt/Docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
        -v /mnt/Docker/nginx:/etc/nginx/conf:ro \
        -v /mnt:/mnt:ro -v /volatile/src:/volatile:ro \
        --log-opt max-size=100m \
        ranadeeppolavarapu/nginx-http3
    ;;

\
    redisinsight)
    docker run --name redisinsight -d $ARGS \
        --net network \
        -v redisinsight:/db \
        redislabs/redisinsight
    ;;

\
    redisinsight-2)
    docker run -d --name redisinsight-2 $ARGS \
        --net network -p 6380:6379 \
        -v /mnt/Docker/redisinsight-2:/data \
        redis/redis-stack

    docker kill -s HUP nginx
    ;;

\
    portainer)
    docker run -d --name portainer $ARGS \
        --net network \
        --security-opt label=disable \
        -v /mnt/Docker/portainer:/data \
        portainer/portainer-ce:alpine

    docker kill -s HUP nginx
    ;;

\
    portainer-agent)
    #sudo systemctl disable firewalld

    ARCH=arm64
    [ $(uname -m) = x86_64 ] && ARCH=amd64

    DOCKER=/var/run/docker.sock
    SRC=/run/user/1000/podman/podman.sock
    which podman || SRC=$DOCKER

    echo Mounting $SRC

    IMAGE=$(curl "https://registry.hub.docker.com/v2/repositories/portainer/agent/tags?name=linux-$ARCH&page_size=2" | jq -r .results[1].name)
    docker run -d --name portainer-agent $ARGS \
        --restart unless-stopped --net network \
        -v $SRC:$DOCKER \
        --security-opt label=disable \
        portainer/agent:$IMAGE
    ;;

\
    pgadmin)
    docker run --name pgadmin -d $ARGS \
        --net network --restart unless-stopped \
        -v /mnt/Docker/pgadmin-servers.json:/pgadmin4/servers.json \
        -e SCRIPT_NAME=/pgadmin \
        -e PGADMIN_DEFAULT_EMAIL=hwanghyun3@gmail.com -e PGADMIN_DEFAULT_PASSWORD=gTff8ULka4NuJsV \
        dpage/pgadmin4

    docker kill -s HUP nginx
    ;;

\
    stream)
    docker run --name stream -d $ARGS \
        --net network -p 8081:80 \
        shurco/nginx-push-stream-module

    docker kill -s HUP nginx
    ;;

\
    registry-browser)
    docker run --name registry-browser -d $ARGS \
        --net network \
        -e DOCKER_REGISTRY_URL=https://nextlab.hwangsehyun.com:41443 \
        -e SCRIPT_NAME=/registrybrowser \
        -e RAILS_RELATIVE_URL_ROOT=/registrybrowser \
        klausmeyer/docker-registry-browser

    docker kill -s HUP nginx
    ;;

\
    container-stats)
    docker run --name container-stats -d $ARGS \
        --net network \
        -v /run/user/1000/podman/podman.sock:/var/run/docker.sock:ro \
        --volume=stats:/opt/docker-stats/db --security-opt label=disable \
        virtualzone/docker-container-stats
    ;;

\
    aws)
    docker run --name aws -d \
        --restart unless-stopped \
        --entrypoint sh \
        -v /mnt:/mnt -v /volatile:/volatile \
        amazon/aws-cli \
        -c 'sleep infinity'
    ;;

\
rtsp-server)
    docker run -d --name rtsp-server \
        -e RTSP_PROTOCOLS=tcp \
        -p 8554:8554 -p 1935:1935 \
        aler9/rtsp-simple-server
    ;;

\
    cctv)
    docker run --name cctv -d \
        linuxserver/ffmpeg \
        -re -i rtsp://root:root@192.168.0.133/cam0_0 \
        -c copy -map 0 -f rtp_mpegts -fec prompeg=l=5:d=20 \
        rtp://18.138.27.6:5000
    ;;

\
    s3)
    docker run -d --name s3 \
        --net network \
        --restart unless-stopped \
        -w /mnt \
        -v /Volumes/dev/node_modules:/mnt/node_modules:ro -v /Volumes/dev/package.json:/package.json:ro \
        -v /Volumes/dev/S3:/mnt/data \
        node:alpine \
        node node_modules/s3rver/bin/s3rver.js -a 0.0.0.0 -d data \
        --no-vhost-buckets --configure-bucket hwangsehyun --configure-bucket nextlab
    ;;

\
    php)
    docker run --name php -d \
        --restart unless-stopped \
        --net network \
        -v php-aws:/mnt/ptais/php-aws -v /mnt/ptais:/mnt/ptais \
        bitnami/php-fpm
    ;;

\
    parallels-backup)
    docker run --name parallels-backup -it \
        --restart unless-stopped \
        -v /Volumes/Data/Parallels:/src:ro -v /Volumes/dev/Parallels:/dsc \
        alpine sh -c 'wget https://www.hwangsehyun.com/Docker/parallels-backup.sh -O script.sh; sh script.sh'
    ;;

\
    meshlab)
    docker run -d --name meshlab \
        --privileged \
        --restart unless-stopped \
        --net network \
        meshlab
    ;;

\
    registry)
    docker run -d --name registry \
        --net network --restart unless-stopped \
        -v /Volumes/dev/DockerRegistry:/var/lib/registry \
        -e REGISTRY_HTTP_HOST=https://nextlab.hwangsehyun.com:41443 \
        registry
    ;;

\
    docker-hub)
    docker run -d --name docker-hub \
        --restart unless-stopped \
        -p 5000:5000 -v /Volumes/dev/DockerHub:/var/lib/registry \
        -e REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io \
        registry
    ;;

\
    mongo)
    Password
    docker run -d --name mongo \
        -w /root -v /Volumes/dev/Mongo:/data/db \
        -p 27017:27017 \
        -e MONGO_INITDB_ROOT_USERNAME=root -e MONGO_INITDB_ROOT_PASSWORD=$REPLY \
        mongo
    ;;

\
    mysql)
    Password
    docker run --name mysql -d \
        --restart always \
        -v /Volumes/dev/MySQL:/var/lib/mysql \
        -e MYSQL_ROOT_PASSWORD=$PASSWORD \
        -p 3306:3306 mysql
    ;;

\
    boilerpipe)
    docker run --rm \
        -p 8000:80 \
        tasubo/boilerpipe-api
    ;;

\
    cache)
    docker run -d --name cache \
        --restart unless-stopped \
        -p 3141:3141 --net network \
        -v /Volumes/dev/pypi:/var/cache/nginx/pypi \
        -v /Volumes/dev/nginx.conf:/etc/nginx/nginx.conf \
        nginx:alpine
    ;;

\
    apt)
    docker run -d --name apt --init \
        --restart unless-stopped \
        -p 3142:3142 --net network \
        -w /root -e CACHE=localhost \
        -v /Volumes/dev/apt:/var/cache/apt-cacher-ng \
        jrcichra/apt-cacher-ng
    ;;

\
    *)
    echo $1 is not a valid container name
    ;;
esac

docker logs --tail 100 $1
