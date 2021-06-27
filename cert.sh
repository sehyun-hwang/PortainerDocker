#sudo cat /volatile/letsencrypt/live/hwangsehyun.com-0002/{fullchain.pem,privkey.pem} | ssh kbdlab@kbdlab.hwangsehyun.com docker run -i --rm -v cert:/cert alpine sh -c 'tee /cert/cert.pem'

set -e
cd /volatile/letsencrypt

[ -z "$1" ] || SSH="ssh $@"
echo $SSH
CMD=`$SSH which docker` || CMD=`$SSH which /usr/local/bin/docker` || exit 1
CMD="$SSH $CMD"
echo $CMD

$CMD volume rm cert || true
$CMD volume create cert

sudo zip -rvFS live.zip live
sudo cat live.zip \
| $CMD run -i --rm \
-v cert:/cert -w /cert \
alpine unzip -


echo 'cat live/hwangsehyun.com/{fullchain.pem,privkey.pem} | tee cert.pem' \
| $CMD run -i --rm -w /cert -v cert:/cert bash

$CMD run -i --rm -v cert:/cert alpine ls /cert