set -e

#docker ps -aq -f ancestor=ymuski/curl-http3 | xargs docker rm -f
#docker images --format "{{.Repository}}:{{.Tag}}" | xargs -L1 docker pull
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

PORTAINER_AGENT_SECRET=mysecrettoken

case $1 in
    nginx)
    docker start pgadmin portainer stream 
    #--requires pgadmin,stream
    docker run --name nginx -d $ARGS \
    --restart unless-stopped \
    --net network --add-host host.docker.internal:`hostname -I` \
    -p 80:80 -p 443:443/tcp -p 443:443/udp -p 5432:5432  \
    -v /etc/localtime:/etc/localtime:ro \
    -v cert:/cert:ro \
    -v /mnt/Docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
    -v /mnt/Docker/nginx:/etc/nginx/conf:ro \
    -v /mnt:/mnt:ro -v /volatile/src:/mnt/volatile2:ro \
    ranadeeppolavarapu/nginx-http3
    ;;
    
    portainer)
    
    
    docker run -d --name portainer $ARGS \
    --net network \
    -v portainer_data:/data \
    portainer/portainer-ce:alpine
    
    docker kill -s HUP nginx
    ;;
    
    portainer-agent)
    
    ARCH=arm64
    [ `uname -m` = x86_64 ] && ARCH=amd64
    
    DOCKER=/var/run/docker.sock
    PODMAN=/run/user/1000/podman/podman.sock
    SRC=$DOCKER
    docker --version | grep Docker || {
        SRC=$PODMAN
        systemctl --user is-active podman.socket || systemctl --user restart podman.socket
    }
    
    echo Mounting $SRC
    
    VERSION=`curl 'https://registry.hub.docker.com/v2/repositories/portainer/agent/tags?page_size=2' | jq -r .results[1].name`
    docker run -d --name portainer-agent $ARGS \
    --restart unless-stopped --net network \
    -v $SRC:$DOCKER \
    --security-opt label=disable \
    portainer/agent:linux-$ARCH-$VERSION-alpine
    ;;
    
    pgadmin)
    docker run --name pgadmin -d $ARGS \
    --net network --restart unless-stopped \
    -v /mnt/Docker/pgadmin-servers.json:/pgadmin4/servers.json \
    -e SCRIPT_NAME=/pgadmin \
    -e PGADMIN_DEFAULT_EMAIL=hwanghyun3@gmail.com -e PGADMIN_DEFAULT_PASSWORD=gTff8ULka4NuJsV \
    dpage/pgadmin4
    
    docker kill -s HUP nginx
    ;;

    stream)
    docker run --name stream -d \
    --net network -p 8081:80 \
    shurco/nginx-push-stream-module
    
    docker kill -s HUP nginx
    ;;
    
    aws)
    docker run --name aws -d \
    --restart unless-stopped \
    --entrypoint sh \
    -v /mnt:/mnt -v /volatile:/volatile \
    amazon/aws-cli \
    -c 'sleep infinity'
    ;;

    code)
    docker run -it --name code --net network \
      -v /mnt/Docker/code-config:/home/coder/.config/code-server \
      -v /mnt:/home/coder/project \
      -p 8080:8080 \
       -u root:root \
       -e "DOCKER_USER=$USER" \
        codercom/code-server
      #

    ;;

    cctv)
    docker run --name cctv -d \
    linuxserver/ffmpeg \
    -re -i rtsp://root:root@192.168.0.133/cam0_0 \
    -c copy -map 0 -f rtp_mpegts -fec prompeg=l=5:d=20 \
    rtp://18.138.27.6:5000
    ;;

    s3)
    docker run -d --name s3 \
    --net network \
    --restart unless-stopped \
    -w /root -v /Volumes/dev/node_modules:/root/node_modules:ro \
    -v /Volumes/dev/S3:/root/data \
    node:alpine \
    sh -c 'wget https://www.hwangsehyun.com/Docker/s3rver.js -O main.mjs && node main.mjs'
    ;;

    php)
    docker run --name php -d \
     --restart unless-stopped \
    --net network \
    -v php-aws:/mnt/ptais/php-aws -v /mnt/ptais:/mnt/ptais \
    bitnami/php-fpm
    ;;

    cloud9)
    docker run --name cloud9 -d \
      --net network -p 8080:8000 \
      -e PUID=1000 -e PGID=1000 -e TZ=Asia/Seoul \
      -v /Volumes/dev:/code \
      linuxserver/cloud9
    #  -e GITURL=https://github.com/linuxserver/docker-cloud9.git \
    #  -e USERNAME= \
    #  -e PASSWORD= \
    ;;



    parallels-backup)
    docker run --name parallels-backup -d \
    --restart always \
    -w /root -v /Volumes/dev/Docker.sh:/root/Docker.sh \
    -v /Volumes/Data/Parallels:/root/src:ro -v /Volumes/dev/Parallels:/root/dsc \
    alpine sh Docker.sh parallels
    ;;

    meshlab)
    docker run -d --name meshlab \
    --privileged \
    --restart unless-stopped \
    --net network \
    meshlab
    ;;

    registry)
    docker run -d --name registry \
    --net network --restart unless-stopped \
    -v /Volumes/dev/DockerRegistry:/var/lib/registry \
    -e REGISTRY_HTTP_HOST=https://nextlab.hwangsehyun.com \
    registry
    ;;

    docker-hub)
    docker run -d --name docker-hub \
    --restart unless-stopped \
    -p 5000:5000 -v /Volumes/dev/DockerHub:/var/lib/registry \
    -e REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io \
    registry;;

    mongo)
    Password
    docker run -d --name mongo \
    -w /root -v /Volumes/dev/Mongo:/data/db \
    -p 27017:27017  \
    -e MONGO_INITDB_ROOT_USERNAME=root -e MONGO_INITDB_ROOT_PASSWORD=$REPLY \
    mongo;;

    mysql)
    Password
    docker run --name mysql -d \
    --restart always \
    -v /Volumes/dev/MySQL:/var/lib/mysql \
    -e MYSQL_ROOT_PASSWORD=$PASSWORD \
    -p 3306:3306 mysql;;


    boilerpipe)
    docker run --rm \
    -p 8000:80 \
    tasubo/boilerpipe-api
    ;;

    cache)
    docker run -d --name cache \
    --restart unless-stopped \
    -p 3141:3141 --net network \
    -v /Volumes/dev/pypi:/var/cache/nginx/pypi \
    -v /Volumes/dev/nginx.conf:/etc/nginx/nginx.conf \
    nginx:alpine
    ;;

    apt)
    docker run -d --name apt --init \
    --restart unless-stopped \
    -p 3142:3142 --net network \
    -w /root -e CACHE=localhost \
    -v /Volumes/dev/apt:/var/cache/apt-cacher-ng \
    sameersbn/apt-cacher-ng:3.3-20200524
    ;;

    webrtc)
    docker run -d --name webrtc \
    --restart unless-stopped \
    --net host \
    webrtc

    ;;

    *)
    echo $1 is not a valid container name
esac

docker ps