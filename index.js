import Emitter from 'events';

import { IsMain } from 'utils';
import { Docker } from './Portainer.js';
import DockerClass, { DefaultDockerClass } from './DockerClass.js';
import DockerClasses from './DockerClasses.js';


let Unpipe;

function Result(stream, { stdout } = process) {
    Unpipe && Unpipe();
    Unpipe = () => stream.unpipe(stdout);
    setTimeout(Unpipe, 10000);
    stream.pipe(process.stdout);

    let data;
    stream.on('data', _data => data = _data);

    const { socket } = stream;
    const destroy = socket.onerror;

    return new Promise((resolve, reject) => {
            socket.onerror = error => error.message === 'invalid status code: 1006' || reject(error);
            socket.onclose = () => resolve(data);
        })

        .finally(destroy);
}


async function Work(container, emitter) {
    try {
        const Log = (...args) => console.log("Contaner", container.id, "has been", ...args);
        Log("created");

        const stream = await container.attach();
        Log("attatched to");
        emitter.emit('Stream', stream);

        Result(stream)
            .then(result => emitter.emit('Result', result))
            .catch(error => console.log('rejected', error));

        setImmediate(container.start.bind(container));
        const { StatusCode: Code } = await container.wait();
        Log("awaited", { Code });
        emitter.emit('Code', Code);

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


async function Run(Options, arg) {
    let dockerClass;

    if (typeof arg === 'number')
        dockerClass = DockerClasses.get(Number(arg));
    else if (arg instanceof DockerClass)
        dockerClass = arg;


    const { docker } = dockerClass;

    const container = await docker.createContainer({
        ...JSON.parse('{"AttachStdin": true, "AttachStdout": true, "AttachStderr": true, "Tty": false, "OpenStdin": true, "StdinOnce": true}'),
        ...IterateDeep(dockerClass.Command(Options), docker.Info),
    });
    const { id } = container;

    const emitter = new Emitter();
    Work(container, emitter)
        .catch(console.log);

    setImmediate(() => {
        emitter.emit('Container', container);
        emitter.emit('id', id);
        container.inspect()
            .then(({ Name }) => emitter.emit('Name', [Name.substr(1), id.substr(0, 12)].join('-')));
    });

    return emitter;
}
export { Docker };
export default Run;


IsMain(
        import.meta.url) && DefaultDockerClass().then(dockerClass => Run({
        Image: 'hello-world',
        Cmd: [],
    }, dockerClass))


    .then(emitter => new Promise(resolve => emitter.once('Result', resolve)))
    .then(data => console.log('Last test message', data.toString()));
