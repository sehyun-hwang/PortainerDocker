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
        port: 4022,
        root: '/Volumes/dev',
        cache: 'cache.network',
    },
    //kbdlab: {},
    //iptime: {},
    //localhost: { username: 'centos'},
};

export const PORTAINER_ENDPOINT = {
    Id: 14,
    PublicURL: 'https://nextlab.hwangsehyun.com',
};


Object.entries(NODES).forEach(([Name, Params]) => NODES[Name] = Object.assign({
    username,
    privateKey: homedir() + '/.ssh/id_rsa',
}, Params));
console.log(NODES);

export const [NODE] = Object.values(NODES);
