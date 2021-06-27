echo Script2.sh
echo $1

set -e

case $1 in
    parallels)
    pigz --version || apk add pigz || exit 1
    [ $(( `du dsc | awk '{ print $1 }'` )) -gt 30000000 ] && rm -v dsc/"`ls -t dsc | head -n 1`"

    ls */*
    date

    sleep 12h
    if [ $(( `date +%s` - `stat -c %Y src/Windows.pvm/Vminfo.pvi` )) -gt 3600 ]; then
    	tar -cvf - src | pigz > dsc/"`date`".tar.gz
    	sleep 1d
    fi
    ;;

    *)
    exit 1
    ;;
esac