import { promises as fs } from "fs";
import { createHash } from 'crypto';

import ExpiryMap from 'expiry-map';
import pMemoize from 'p-memoize';
import Dockerode from 'dockerode';

import { IsMain } from "utils";
import { NODE, HOST, dir, RERUN } from './CONFIG.js';
import { IMAGES } from './Command.js';


export const Hash = data => createHash('md5').update(JSON.stringify(data)).digest('hex');


export function StopSocatStartExpress(docker) {
    console.log('Stopping socat, Starting express');
    const Cmd = ["sh", "-c", 'docker stop socat && docker start express'];


    async function wait(condition) {
        console.log('waiting', condition);

        while (condition !== await docker.ping()
            .then(() => true)
            .catch(() => process.stdout.write('=') && false));
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log('\nwaited', condition);
    }


    return docker.createContainer({
        Image: "docker",
        Cmd,
        HostConfig: {
            Binds: [
                '/var/run/docker.sock:/var/run/docker.sock',
            ],
        },
    }).then(async Container => {
        console.log(Cmd, 'created');
        await Container.start();
        await wait(false);
        await wait(true);
        await Container.remove();
        console.log('docker removed');
    });
}


export async function Script(docker, Command, Data) {
    const Container = Array.isArray(Data) ? Data.find(x => x.Names[0] === "/script") : true;
    const SCRIPT = await fs.readFile(dir + "/Script.sh")
        .then(data => {
            const SCRIPT = Hash(data);
            if (typeof Container === 'object' && Container.Labels.SCRIPT === SCRIPT);
            else return SCRIPT;
        });

    //console.log({ SCRIPT });
    if (RERUN.includes('script') || SCRIPT);
    else
        return Data;

    console.log("script Container");
    await Pull(docker);
    Container && await docker.getContainer("script").remove()
        .catch(console.log);

    const Params = Command({
        Image: "alpine",
        name: "script",
        Labels: { SCRIPT },
        Cmd: ["wget", "-O", "Docker.sh", `https://${HOST}/Docker/Script.sh`],
    });
    const { Binds } = Params.HostConfig;
    Binds[0] = Binds[0].replace(':ro', '');

    await docker.createContainer(Params)
        .then(Container => Container.start());
    return Data;
}


const checkLatestDigests = pMemoize(image => {
    let [repository, tag='latest'] = image.split(':');
    if (!repository.includes('/'))
        repository = 'library/' + repository;
    console.log('Searching Docker Hub', { repository, tag });

    return fetch(`https://registry.hub.docker.com/v2/repositories/${repository}/tags?` + new URLSearchParams({
            name: tag || 'latest',
            page_size: 1,
        }))
        .then(res => res.ok ? res.json() : Promise.reject(res))
        .then(({ results: [{ images }] }) => [image, new Set(images.map(({ digest }) => digest))]);

}, {
    cache: new ExpiryMap(60 * 1000),
});


export async function Pull(docker) {
    let [localImages, ...latestDigests] = await Promise.all([
        docker.listImages(),
        ...IMAGES.map(checkLatestDigests)
    ]);
    localImages = localImages.map(({ Digests }) => Digests);
    latestDigests = Object.fromEntries(latestDigests);
    //console.log(localImages, latestDigests);

    const pullRequests = IMAGES.filter(image => localImages.some(localImage => latestDigests[image].has(localImage)));

    if (!pullRequests.length)
        return console.log('All images are up to date');

    console.log('Pulling', pullRequests);
    const { followProgress, host } = docker.modem;

    return Promise.all(pullRequests.map(Image => docker.pull(Image).then(stream => {
            let args;
            const promise = new Promise((..._args) => args = _args);
            const [resolve, reject] = args;

            followProgress(stream,
                (error, output) => error ? reject(error) : resolve(output.pop().status),
                ({ status, id, progress }) => console.log(host, status, id, progress));
            return promise;
        })))

        .then(console.log);
}



if (IsMain(
        import.meta.url)) {
    checkLatestDigests(IMAGES[0]);
    Pull(new Dockerode());
}
