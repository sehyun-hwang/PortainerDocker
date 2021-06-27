const Rerun = '';
const port = 2376;
const CERT = '/cert/cert.pem';
//const OpenSSLListen = ;


import { promises as fs } from "fs";
import { createHash } from 'crypto';

import got from 'got';

import { NodeSSH as SSH } from "node-ssh";
import { MyURL, PathParser } from "utils";
import SSHOptions from "./SSHOptions.js";
const { IsMain, App } = PathParser(
    import.meta.url);
import { Docker } from './index.js';
import Cert from './cert.js';
import ProxyServer from './ProxyServer.js';
import { Commands, Names, Command as _Command } from './Command.js';

const Hash = data => createHash('md5').update(JSON.stringify(data)).digest('hex');

class DockerClass {
    constructor(Subdomain, Params) {
        const docker = Docker(Subdomain);
        const IsNextlab = Subdomain === "nextlab";
        const DockerBin = IsNextlab ? '/usr/local/bin/docker' : 'docker';

        Params = Object.assign({
            username: "hwangsehyun",
            privateKey: `/home/${process.env.USER}/.ssh/id_rsa`,
        }, Params);
        if (!Params.host)
            Params.host = MyURL[Subdomain].hostname;
        if (!Params.root)
            Params.root = '/home/' + Params.username;
        console.log(Params);

        const Command = (...args) => {
            const Return = _Command(Params.root, ...args);
            Return.Env.push('SUBDOMAIN=' + Subdomain);
            Params.cache && Return.Env.push('CACHE=' + Params.cache);
            return Return;
        };
        this.Commands = Commands.map(Command);

        if (Subdomain === 'www') {
            const ExpressCommand = this.Commands.find(({ name }) => name === 'express');
            delete ExpressCommand.ExposedPorts;

            const { HostConfig } = ExpressCommand;
            delete HostConfig.PortBindings;

            HostConfig.Binds = [
                HostConfig.Binds.find(x => x.endsWith('Docker.sh')),
                '/volatile/node_modules:/root/node_modules:ro',
            ];
            console.log('Command modified', ExpressCommand);
        }

        Object.assign(this, { Subdomain, Params, docker, IsNextlab, DockerBin, Command });
    }

    command([container]) {
        return container === 'script' ? this.Script() : this.main([this.docker.getContainer(container)]);
    }

    init() {
        const { Params, DockerBin } = this;
        const ssh = new SSH();

        return Promise.all([Cert, ssh.connect(Params)])

            .then(([stdin]) => Promise.all([
                got('http://checkip.amazonaws.com').text(),

                ssh.exec(DockerBin,
                    `run -i --rm -v cert:/cert alpine cp /dev/stdin ${CERT}`.split(' '), {
                        stdin
                    }),
                ssh.exec('touch', [Params.root + '/Docker.sh']),

                ssh.exec(DockerBin, "rm -f socat".split(' '))
                .then(data => console.log("Remove", data))
                .catch(error => error.message.includes("No such container") || Promise.reject(error)),
            ]))

            .then(([IP]) => new Promise(resolve => {
                const Timeout = 3;

                const { IsNextlab } = this;
                const options = SSHOptions("both", new Error());
                const { onStdout, onStderr } = options;

                ssh.exec(DockerBin, [
                    "run",
                    "--name", "socat",
                    "--restart", "unless-stopped",
                    ...(IsNextlab ? ['-p', [port, port].join(':')] : ['--net', 'host']),
                    "-v", "cert:/cert",
                    "-v", "/var/run/docker.sock:/root/docker.sock",
                    "alpine/socat", [
                        `OPENSSL-LISTEN:${port}`,
                        'verify=0', 'fork',
                        'reuseaddr',
                        `cert=${CERT}`,
                        `cafile=${CERT}`,
                        ...(IsNextlab ? [] : [`range=${IP.trim()}/32`])
                    ].join(','),
                    "UNIX-CONNECT:/root/docker.sock",
                ], {
                    ...options,
                    onStdout: chunk => resolve(onStdout(chunk)),
                    onStderr: chunk => {
                        if (chunk.toString().includes("E SSL_accept(): error:1408F09C:SSL routines:ssl3_get_record:http request")) return;
                        resolve(onStderr(chunk));
                    },
                });


                setTimeout(() => resolve(`socat resolved after ${Timeout}s`), Timeout * 1000);
            }))

            .then(data => console.log("Running. First message:", data))
            .finally(function () {
                ssh.dispose();
                console.log('ssh disposed');
            });
    }

    main(Containers) {
        Promise.all(Containers.map(async x => {
                const {} = this;
                const { Remove } = x;

                try {
                    (Remove === undefined || Remove) && await x.remove({ force: true });
                }
                catch (error) {
                    console.log(error);
                }
                Remove === undefined && console.log("Remove is undefined");

                const Command = this.Commands.find(Command => Command.name === x.id);
                if (!Command)
                    return Promise.reject(`Container ${x} does not exsists`);

                Command.Labels.COMMAND = Hash(Command);
                await this.docker.createContainer(Command);
                await x.start();

                return Command.name;
            }))
            .then(console.log.bind(undefined, 'Successfully started:'))

            .finally(() => console.log("Finally"));
    }

    async Script(Data) {
        const { docker } = this;

        const Container = Array.isArray(Data) ? Data.find(x => x.Names[0] === "/script") : true;
        const SCRIPT = await fs.readFile((IsMain ? "." : App) + "/Script.sh")
            .then(data => {
                const SCRIPT = Hash(data);
                if (typeof Container === 'object' && Container.Labels.SCRIPT === SCRIPT);
                else return SCRIPT;
            });

        //console.log({ SCRIPT });
        if (Rerun.includes('script') || SCRIPT);
        else
            return Data;

        console.log("script Container");
        Container && await docker.getContainer("script").remove()
            .catch(console.log);

        const Params = this.Command({
            Image: "alpine",
            name: "script",
            Labels: { SCRIPT },
            Cmd: ["wget", "-O", "Docker.sh", MyURL.www + "Docker/Script.sh"],
        });
        const { Binds } = Params.HostConfig;
        Binds[0] = Binds[0].replace(':ro', '');
        await docker.createContainer(Params)
            .then(Container => Container.start());

        return Data;
    }

    async Info() {
        const { docker } = this;

        console.log("Info");
        const Info = await docker.info();
        Object.assign(docker, { Info });

        const { Architecture, Name } = Info;
        const obj = {
            Name,
            IsDesktop: Name === 'docker-desktop',
            Architecture
        };
        console.log(obj);
        Object.assign(this, obj);
    }

    Run() {
        const { docker, Script, Commands, Name } = this;

        return (async() => {
                if (!Name)
                    await this.Info();

                console.log("List containers");
                const ListContainers = () => docker.listContainers({
                    all: true,
                    filters: { name: [...Names, "script"] },
                });

                try {
                    return await ListContainers();
                }
                catch (error) {
                    if ([502, 504].includes(error.statusCode) ||
                        !error.message.trim().endsWith('CERT_HAS_EXPIRED')
                    )
                        return Promise.reject(error);
                }

                console.log("Retrying List Containers");
                await this.init();

                return ListContainers();
            })()

            .then(Script.bind(this))

            .then(async Data => {
                console.log("Filter");
                const Containers = Names.map(x => docker.getContainer(x));

                const Filtered = Containers.filter((Container, i) => {
                    const { id } = Container;
                    const data = Data.find(x => x.Names[0].substring(1) == id);
                    Container.Remove = Boolean(data);

                    if (!data)
                        return true;

                    if (Rerun.includes(id)) {
                        console.log('Container', Container.id, 'to be force removed');
                        return true;
                    }

                    console.log(data.Labels.COMMAND, Hash(Commands[i]));

                    if (data.Labels.COMMAND !== Hash(Commands[i]))
                        return true;
                    return id === 'script' ? false : data.State !== "running";

                });

                const Script = [Containers];
                if (Script === Filtered[0]) {
                    await this.init();
                    Filtered.shift();
                }

                console.log("Trying container(s):", ...Filtered.map(x => x.id));
                await this.main(Filtered);
            });
    }
}

const Classes = [
    new DockerClass('nextlab', {
        port: 4022,
        root: '/Volumes/dev',
        cache: 'cache.network',
    }),
    new DockerClass('kbdlab'),
    /*new DockerClass('iptime', {
        username: 'admin',
    }),
    new DockerClass('www', {
        username: 'admin',
    }),*/
];

export function command(args) {
    if (0 < args.length <= 2);
    else
        throw new Error('Invalid format argument: Should be [Subdomain] <Container>');
    const Subdomain = args.length === 1 ? 'nextlab' : args.shift();
    const Class = Classes.find(x => x.Subdomain === Subdomain);
    if (!Class)
        throw new Error(`Subdomain ${Subdomain} does not exsists`);

    return Class.command(args);
}

export default ProxyServer.then(() => Promise.allSettled(Classes.map(x => x.Run().then(() => x))))

    .then(x => x.filter(x => x.status === 'fulfilled' || console.log(x))
        .reduce((accum, { value: { Subdomain, Command } }) => {
            accum[Subdomain] = Command;
            return accum;
        }, {}))

    .catch(console.log);
