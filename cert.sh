set -e

#sudo docker run -it --rm -v cert:/etc/letsencrypt certbot/dns-route53 certonly -d '*.hwangsehyun.com' -d hwangsehyun.com --dns-route53

[ -z "$1" ] || SSH="ssh $@"
echo $SSH
CMD=`$SSH which docker` || CMD=`$SSH which /usr/local/bin/docker` || exit 1
CMD="$SSH $CMD"
echo $CMD

echo 'cat /cert/live/hwangsehyun.com/{fullchain.pem,privkey.pem}' \
| sudo docker run -i --rm -w /cert -v cert:/cert bash \
| $CMD run -i --rm -v cert:/cert \
alpine tee /cert/cert.pem

$CMD run -i --rm -v cert:/cert --security-opt=label=disable alpine ls -la /cert