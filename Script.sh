export URL=https://www.hwangsehyun.com
echo Started $1
date
ls | xargs

if [ ! -z $CACHE ]; then
    #CACHE=cache
    #--build-arg PIP_INDEX_URL=http://172.17.0.1:3141/simple/ --build-arg PIP_TRUSTED_HOST=172.17.0.1
    export PIP_INDEX_URL=http://$CACHE:3141/simple/
    export PIP_TRUSTED_HOST=$CACHE
    [ -d /etc/apt/apt.conf.d ] && printf "Acquire::HTTP::Proxy \"http://$CACHE:3142\";\nAcquire::HTTPS::Proxy \"false\";" >> /etc/apt/apt.conf.d/01proxy
fi

[ -z $PIP ] || pip3 install $PIP


case $1 in
    express)
    wget -O Express.mjs $URL/Docker/Express.js
    node Express.mjs
    ;;

    robot)
    SITE=`python3 -m site --user-site`
    mkdir -p $SITE
    touch $SITE/cv2.py
    curl $URL/robot/Robot.py > Robot.py
    python -u Robot.py
    #python -c "import urllib.request; print(urllib.request.urlopen('$URL/robot/Robot.py').read().decode())" | python -u
    ;;

    param-server)
    curl $URL/robot/param-server/$2.py > $2.py
    python -u $2.py
    ;;

    *)
    ( wget -qO - $URL/Docker/Script2.sh || curl $URL/Docker/Script2.sh )  | sh -s - $1 $2
esac