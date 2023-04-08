import { hostname, homedir } from 'os';


import { PathParser } from "utils";
export const { dir } = PathParser(
    import.meta.url);

export const HOST = hostname();
export const port = 443;
const username = 'hwangsehyun';
export const RERUN = '';


export const PORTAINER_TOKEN = dir + '/PortainerToken.txt';
export const PORTAINER_API = new URL('https://proxy.hwangsehyun.com/portainer/api');
export const PORTAINER_AUTH = JSON.parse(process.env.PORTAINER || '{}');


export const NODES = {
    nextlab: {
        port: 41022,
        root: '/Volumes/dev',
        cache: 'cache.network',
    },
    /*ngrok: {
        sshHost: 'localhost',
        port: 2222,
        root: '/Volumes/dev',
        cache: 'cache.network',
    },*/
    //iptime: {},
    //localhost: { username: 'centos'},
};

export const PORTAINER_ENDPOINT = {
    Id: 2,
    PublicURL: 'https://nextlab.hwangsehyun.com:41443',
};


Object.entries(NODES).forEach(([Name, Params]) => NODES[Name] = Object.assign({
    username,
    privateKeyPath: homedir() + '/.ssh/id_ed25519',
}, Params));
console.log(NODES);

export const [NODE] = Object.values(NODES);
