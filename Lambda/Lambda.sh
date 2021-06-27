docker build -t alpine-lambda .
docker tag alpine-lambda:latest 248837585826.dkr.ecr.ap-southeast-1.amazonaws.com/alpine-lambda:latest
docker push 248837585826.dkr.ecr.ap-southeast-1.amazonaws.com/alpine-lambda:latest
aws lambda update-function-code --function-name AlpineLambda --image-uri 248837585826.dkr.ecr.ap-southeast-1.amazonaws.com/alpine-lambda:latest
