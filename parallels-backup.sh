[ $(( `du dsc | awk '{ print $1 }'` )) -gt 30000000 ] && rm -v dsc/"`ls -t dsc | head -n 1`"

ls src dsc
date

#sleep 12h
tar -cvf "dsc/`date`".tar src  --checkpoint=1000
if [ $(( `date +%s` - `stat -c %Y src/Windows.pvm/Vminfo.pvi` )) -gt 3600 ]; then
	tar -cvf "dsc/`date`".tar src
	sleep 1d
fi