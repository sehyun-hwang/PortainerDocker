import got from 'got';
import colog from 'colog';

import { IsMain } from 'utils';
import { PORTAINER_API } from './CONFIG.js';



const test = () =>
    import ('./Express.js')
    .then(({ default: app, io_client }) => new Promise((resolve, reject) => app.listen(0)
        .on('error', reject)
        .once('listening', function () {
            resolve([this.address(), () => {
                this.close();
                io_client.close();
            }]);
        })))

    .then(async([address, cleanup]) => {
        console.log('ExpressTest is listening', address);
        const Path = 'http://localhost:' + address.port;

        const PortainerErrorHandler = error => {
            delete error.timings;
            console.log(error);
            const Pass = error.response.body ===
                '{"error":{"errno":-3008,"code":"ENOTFOUND","syscall":"getaddrinfo","hostname":"portainer-agent.network"},"href":"https://portainer-agent.network:9001/"}';
            return Promise[Pass ? 'resolve' : 'reject'](error);
        };


        return Promise.all([
            got('http://127.0.0.1:' + address.port, {
                followRedirect: false,
            }).then(({ headers: { location } }) => {
                console.log('ExpressTest redirecting to', location);
                const url = new URL(location);
                if (url.protocol !== 'https:')
                    return Promise.reject('Redirect not working');
            }),

            got(Path, {
                headers: {
                    Referer: PORTAINER_API.toString().replace('api', ''),
                },
                retry: 0,
            }).catch(PortainerErrorHandler),

            ...['Go-http-client', 'Dockerode'].map(x => got(Path, {
                headers: {
                    'User-Agent': x,
                },
                followRedirect: false,
                retry: 0,
            }).catch(PortainerErrorHandler)),

        ]).finally(cleanup);
    })

    .then(colog.success.bind(colog, 'ExpressTest has succeeded'))

    .catch(error => {
        colog.error(error);
        console.log(error);
    });


export default test;
IsMain(
    import.meta.url) && test();
