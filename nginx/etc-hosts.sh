#!/bin/sh
set -e

CONF_PATH=/etc/nginx/conf.d/etc-hosts.conf

echo 'map $redirect_host $etc_hosts_map  {' > $CONF_PATH
awk '!seen[$2]++ {printf("~%s:([\\d]+) %s:$1;\n", $2, $1)}' /etc/hosts >> $CONF_PATH
echo 'default $redirect_host; }' >> $CONF_PATH
