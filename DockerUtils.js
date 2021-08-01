import { promises as fs } from "fs";
import { createHash } from 'crypto';


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


export async function Script(docker, Data) {
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

    const Params = this.Command({
        Image: "alpine",
        name: "script",
        Labels: { SCRIPT },
        Cmd: ["wget", "-O", "Docker.sh", `https://${HOST}/Docker/Script.sh`],
    });
    const { Binds } = Params.HostConfig;
    Binds[0] = Binds[0].replace(':ro', '');

    return docker.createContainer(Params)
        .then(Container => Container.start())
        .then(() => Data);
}


export function Pull(docker) {
    const { followProgress, host } = docker.modem;

    return Promise.all(IMAGES.map(Image => docker.pull(Image).then(stream => {
            let args;
            const promise = new Promise((..._args) => args = _args);
            const [resolve, reject] = args;

            followProgress(stream,
                (error, output) => error ? reject(error) : resolve(output.pop().status),
                console.log.bind(undefined, host));
            return promise;
        })))

        .then(console.log);
}
