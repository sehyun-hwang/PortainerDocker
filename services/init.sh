for x in `cat containers.txt`; do
    bash docker.sh $x
done