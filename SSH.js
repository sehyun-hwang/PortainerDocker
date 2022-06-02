import { NodeSSH as SSH } from "node-ssh";

import { IsMain } from "utils";
import { NODE, PORTAINER_ENDPOINT, port } from './CONFIG.js';


function Log(prefix, chunk) {
    const message = chunk.toString();
    console.log(prefix, message);
    return message;
}


function Options(stream, Title) {
    const options = {
        stream,
    };
    if (!"stdout stderr both".includes(stream))
        throw new Error("stdio options are not valid");

    if (["stdout", "both"].includes(stream))
        options.onStdout = Log.bind(undefined, `[SSH @ ${Title}]`);
    if (["stderr", "both"].includes(stream))
        options.onStderr = Log.bind(undefined, `[SSH stderr @ ${Title}]`);

    return options;
}


export async function init(params) {
    const ssh = new SSH();
    const { sshHost } = params;
    if (sshHost)
        params = { ...params, host: sshHost };
    console.log('SSH', params);
    await ssh.connect(params);

    const DESKTOP_BIN = '/usr/local/bin/docker';
    const DockerBin = await ssh.exec('ls', [DESKTOP_BIN])
        .then(() => DESKTOP_BIN, () => 'docker');
    const IsDesktop = DockerBin === DESKTOP_BIN;

    const CONTAINERS = ['portainer-agent', 'socat'];
    const { code, stdout, stderr } = await ssh.exec(DockerBin, ['inspect', ...CONTAINERS], {
        stream: 'both'
    });
    if (code && !stderr.toLowerCase().includes('no such object:'))
        return Promise.reject(stderr);

    const Inspects = JSON.parse(stdout);
    const [PortainerInspect, SocatInspect] = CONTAINERS.map(x => Inspects.find(({ Name }) => Name && Name.replace('/', '') === x));


    if (!PortainerInspect)
        return Promise.reject('Container "portainer-agent" is not found. Try docker run --name portaienr-agent.');
    if (!PortainerInspect.State.Running)
        return Promise.reject('Container "portainer-agent" is not running. Try docker start portaienr-agent.');

    if (SocatInspect) {
        console.log('Starting socat');
        return ssh.exec(DockerBin, ['start', 'socat']);
    }

    const options = Options("both", params.host);
    const { onStdout, onStderr } = options;
    console.log('First message from socat', await new Promise((resolve, reject) => ssh.exec(DockerBin, [
            "run",
            "--name", "socat",
            "--restart", "unless-stopped",
            ...(IsDesktop ? ['--net', 'network', '-p', [port, port].join(':')] : ['--net', 'host']),
            "alpine/socat",
            '-dd', '-v',
            `TCP-LISTEN:${port},fork,reuseaddr`,
            "TCP:portainer-agent:9001",
        ], {
            ...options,
            onStdout: message => resolve(onStdout(message)),
            onStderr: message => {
                message = onStderr(message);
                message.includes('listening') && resolve(message);
            },
        })

        .catch(reject)));

    ssh.dispose();
}

if (IsMain(
        import.meta.url)) {
    init(Object.assign(NODE, {
        host: new URL(PORTAINER_ENDPOINT.PublicURL).hostname,
    }));
    /*init(Object.assign(NODES.localhost, {
        host: 'www.hwangsehyun.com'
    }));*/
}
