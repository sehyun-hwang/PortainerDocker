block return in proto tcp from any to any port 2376
pass in inet proto tcp from 127.0.0.1 to any port 2376 no state
pass in inet proto tcp from 18.140.187.138 to any port 2376 no state

sudo pfctl -f /etc/pf.conf
sudo pfctl -E