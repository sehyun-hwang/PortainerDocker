import { promises as fs } from 'fs';
import got from 'got';
import _ from 'lodash';

import { IsMain } from 'utils';
import { PORTAINER_AUTH, PORTAINER_TOKEN, PORTAINER_API } from './CONFIG.js';
import PortainerDocker, { headers } from './PortainerDocker.js';

['username', 'password'].filter(x => {
    if (x in PORTAINER_AUTH);
    else
        console.log(new Error(x + ' is missing in process.env.PORTAINER. got: ' + process.env.PORTAINER));
});
let Endpoints;


const PortainerAuth = () => got.post(PORTAINER_API + '/auth', {
        json: PORTAINER_AUTH
    }).json()

    .then(({ jwt }) => {
        const Authorization = 'Bearer ' + jwt;
        console.log('Portainer Authorization', Authorization);
        fs.writeFile(PORTAINER_TOKEN, Authorization)
            .then(console.log);
        Object.assign(headers, { Authorization });
    }, error => {
        console.log(error);
        Promise.reject('Portainer API is not running at ' + PORTAINER_API);
    });



let Dockers;

const DockersPromise = PortainerAuth()

    .then(() => got(PORTAINER_API + '/endpoints', { headers }).json())

    .then(async _Endpoints => {
        Endpoints = _Endpoints;

        console.table(Endpoints, Object.entries(Endpoints[0]).filter(([_, prop]) => typeof prop !== 'object')
            .map(([attr]) => attr));

        const _Dockers = Endpoints.map(({ Id, PublicURL }) => new PortainerDocker({ PublicURL, Id }));
        Dockers = new Map(_.zip([
            ...Endpoints.map(({ Id }) => Id),
            ...Endpoints.map(({ Name }) => Name)
        ], _Dockers.concat(_Dockers)));
        console.log('new Map created:', ...Dockers.keys());

        Promise.allSettled(_Dockers.map(x => x.assignInfo()))
            .then(console.log);
        return _Dockers;
    });
export default DockersPromise;


export function Docker(query) {
    if (!Dockers.has(query))
        throw new Error(query + ' is not listed in Portainer endpoints');
    return Dockers.get(query);
}


IsMain(
    import.meta.url) ? DockersPromise.then(console.log) : setInterval(PortainerAuth, 3600 * 1000);
