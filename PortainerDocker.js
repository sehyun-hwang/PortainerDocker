import { readFileSync } from 'fs';
import Dockerode from 'dockerode';
import WebSocketStream from 'websocket-stream';


import { IsMain } from "utils";
import { PORTAINER_API, PORTAINER_TOKEN, PORTAINER_ENDPOINT } from './CONFIG.js';

export const headers = {
    'User-Agent': 'Dockerode',
    Referer: PORTAINER_API.toString().replace('api', ''),
    Authorization: readFileSync(PORTAINER_TOKEN, 'utf-8'),
};


function attach(Params) {
    return this.inspect().then(({ Id }) => {
        const { protocol, host, version, headers } = this.modem;
        const [match, endpointId] = /endpoints\/(\d+)\/docker/.exec(version);
        const url = protocol.replace('http', 'ws') + '://' + host + '/' + version.replace(match, 'websocket/attach?') + new URLSearchParams({
            token: headers.Authorization.replace('Bearer ', ''),
            endpointId,
            id: Id,
        });
        console.log('Attatching via Web Socket', url);
        return WebSocketStream(url);
    });
}
Object.assign(Dockerode.Container.prototype, { attach });


export default class PortainerDocker extends Dockerode {


    constructor(Args, { protocol, host, pathname } = PORTAINER_API) {
        const Params = {
            protocol: protocol.replace(':', ''),
            host,
            version: [pathname.replace('/', ''), 'endpoints', Args.Id, 'docker'].join('/'),
            headers,
        };
        console.log(Args, Params, );

        super(Params);
        Object.defineProperty(this, 'modem', {
            enumerable: false,
        });


        let resolveReady;
        this.Ready = new Promise(resolve => resolveReady = resolve);
        Object.assign(this, { ...Args, Params, resolveReady });
    }


    assignInfo() {
        return this.info()
            .then(Info => Object.assign(this, { Info }))
            .then(this.resolveReady.bind(this))
            .catch(console.log);
    }


}


export const DefaultPortainerDocker = () => new PortainerDocker(PORTAINER_ENDPOINT);


/*IsMain(
        import.meta.url) && DefaultPortainerDocker().getContainer('express')
    .attach().then(stream => {
        console.log('stream');
        stream.pipe(process.stdout, { end: false });
    });*/


IsMain(
        import.meta.url) && Promise.all([
        import ('./DockerUtils.js'),
        DefaultPortainerDocker()
    ])
    .then(([{ Pull }, docker]) => Pull(docker))
    .then(console.log);
