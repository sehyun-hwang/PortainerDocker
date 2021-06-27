import got from 'got';
import Docker from 'dockerode';


const password = process.env.PORTAINER;
const PORTAINER_API = new URL('https://proxy.hwangsehyun.com/portainer/api');
let authorization;
const headers = {
    get authorization() {
        return authorization;
    },
};
if (!password)
    throw new Error('process.env.PORTAINER is missing');


const docker = new Docker({
    protocol: PORTAINER_API.protocol.replace(':', ''),
    host: PORTAINER_API.host,
    version: PORTAINER_API.pathname.replace('/', '') + '/endpoints/24/docker/',
    headers,
});

let Endpoints = [];


//nextlab, kbdlab, localhost -> PublicURL lookup -> Docker object




got.post(PORTAINER_API + '/auth', {
        json: { "username": "nextlab", password }
    }).json()

    .then(({ jwt }) => {
        console.log(jwt);
        authorization = 'Bearer ' + jwt;
    })
    .then(() => {
        docker.version().then(console.log);
        got(PORTAINER_API + '/endpoints', { headers }).json().then(data => {
            console.log(data);
            Endpoints = data;
        });
    });
