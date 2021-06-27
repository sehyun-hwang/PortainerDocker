import S3rver from 's3rver';

new S3rver({
    address: '0.0.0.0',
    configureBuckets: [{
        name: 'hwangsehyun',
    }, {
        name: 'nextlab',
    }],
    vhostBuckets: false,
    directory: 'data',


}).run(console.log);
