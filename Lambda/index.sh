#!/bin/sh

echo $AWS_LAMBDA_RUNTIME_API
PAYLOAD=`mktemp`
echo $PAYLOAD

while :; do
    curl -v http://${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation/next &> $PAYLOAD
    #cat $PAYLOAD
    REQEST_ID=`awk '$2 == "Lambda-Runtime-Aws-Request-Id:" { print $3 }' $PAYLOAD`
    echo REQEST_ID $REQEST_ID
    $@
    curl "http://${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation/$REQEST_ID/response" --data-binary @$PAYLOAD
done