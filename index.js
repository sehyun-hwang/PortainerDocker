import { createInterface as ReadLine } from "readline";
import Emitter from 'events';

import got from "got";
import Dockerode from "dockerode";

import { port } from './ProxyServer.js';
import Commands from './Server.js';
import memoizee from 'memoizee';

export const Docker = memoizee((Subdomain = 'nextlab') => new Dockerode({
    socketPath: undefined,
    host: "127.0.0.1",
    port,
    headers: {
        'X-Subdomain': Subdomain,
    },
}), { length: 1 });

let Unpipe;

async function Work(container, emitter) {
    try {
        const Log = (...args) => console.log("Contaner", container.id, "has been", ...args);
        Log("created");

        //stream && stream.end();
        const data = await container.attach({
            stream: true,
            stdin: true,
            stdout: true,
            stderr: true,
        }).then(stream => {
            const { stdout } = process;
            emitter.emit('Stream', stream);

            Unpipe && Unpipe();
            Unpipe = () => stream.unpipe(stdout);
            setTimeout(Unpipe, 10000);

            stream.pipe(stdout);
            //container.modem.demuxStream(stream, process.stdout, process.stderr);

            Log("attatched to");

            const arr = [];
            ReadLine(stream).on("line", data => {
                arr.push(data);
                arr.length === 5 && arr.shift();
            });

            return arr;
        });

        await container.start();
        Log("started");
        const { StatusCode: Code } = await container.wait();
        emitter.emit('Code', Code);
        Log("awaited", { Code });
        emitter.emit('Result', data.shift());
    }
    catch (error) {
        emitter.emit('error', error);
        console.log(error);
    }
    finally {
        if (container) {
            emitter.emit('Finished');
            //await container.remove({ force: true });
            //console.log("Container", container.id, "has been removed");
            //emitter.emit('Removed');
        }
        else
            console.log("Failed to create ontainer");
    }
}


function IterateDeep(obj, arg) {
    Object.entries(obj).forEach(([key, value]) => {
        const type = typeof value;

        if (type === 'function')
            obj[key] = value(arg);
        else if (type === 'object')
            IterateDeep(value, arg);
    });

    return obj;
}


export default (Options, Subdomain = 'nextlab') => new Promise((resolve, reject) => {
        let i = 0;

        const Test = () => got(`http://localhost:${port}/_ping`)
            .then(resolve)
            .catch(error => {
                console.log(error);
                i < 3 ? setTimeout(Test, 1000) : reject(new Error("Dockerode not responding"));
            });
        Test();
    })
    .then(async() => {
        const docker = Docker(Subdomain);

        const container = await Commands.then(Commands => docker.createContainer({
            ...JSON.parse('{"AttachStdin": true, "AttachStdout": true, "AttachStderr": true, "Tty": true, "OpenStdin": true, "StdinOnce": true}'),
            ...IterateDeep(Commands[Subdomain](Options), docker.Info),
        }));

        const { id } = container;

        const emitter = new Emitter();

        Work(container, emitter)
            .catch(console.log);

        setTimeout(() => {
            emitter.emit('Container', container);
            emitter.emit('id', id);
            container.inspect()
                .then(({ Name }) => emitter.emit('Name', [Name.substr(1), id.substr(0, 12)].join('-')));
        }, 0);

        return emitter;
    });
