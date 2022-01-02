const CERT = '/cert/cert.pem';
//const OpenSSLListen = ;

import colog from 'colog';

import { PathParser, ExternalIP } from "utils";
import { NODE, RERUN } from './CONFIG.js';
import { init } from "./SSH.js";
//import Cert from './cert.js';
import { Commands, Names, CommandFactory } from './Command.js';
import { Hash, Pull, StopSocatStartExpress, Script, } from './DockerUtils.js';


const { IsMain, } = PathParser(
    import.meta.url);

export default class DockerClass {


    constructor(docker, Params) {
        const { PublicURL } = docker;
        Params.host = new URL(PublicURL).hostname;
        if (!Params.root)
            Params.root = '/home/' + Params.username;
        console.log(Params);

        const Command = (...args) => {
            const Return = CommandFactory(Params.root, ...args);
            Return.Env.push('PUBLIC_URL=' + PublicURL);
            Params.cache && Return.Env.push('CACHE=' + Params.cache);
            return Return;
        };
        this.Commands = Commands.map(Command);

        /*if (Name === hostname()) {
            const ExpressCommand = this.Commands.find(({ name }) => name === 'express');
            delete ExpressCommand.ExposedPorts;

            const { HostConfig } = ExpressCommand;
            delete HostConfig.PortBindings;

            HostConfig.Binds = [
                HostConfig.Binds.find(x => x.endsWith('Docker.sh')),
                '/volatile/node_modules:/root/node_modules:ro',
            ];
            console.log('Command modified', ExpressCommand);
        }*/

        Object.assign(this, { PublicURL, docker, Params, Command, });
    }


    command([container]) {
        const { docker } = this;
        return container === 'script' ? Script(docker) : this.main([docker.getContainer(container)]);
    }


    main(Containers, ExpressRunning) {
        const { docker } = this;

        Promise.all(Containers.map(async x => {
                const { Remove } = x;

                try {
                    (Remove === undefined || Remove) && await x.remove({ force: true });
                }
                catch (error) {
                    console.warn(error);
                }
                Remove === undefined && console.warn("Remove is undefined");

                const Command = this.Commands.find(Command => Command.name === x.id);
                if (!Command)
                    return Promise.reject(`Container "${x}" does not exsists`);

                Command.Labels.COMMAND = Hash(Command);
                return docker.createContainer(Command).then(() => () => x.start().then(() => Command.name));
            }))


            .then(Starts => {
                if (!ExpressRunning) {
                    const Express = Containers.find(({ id }) => id === 'express');
                    Express.start = StopSocatStartExpress.bind(undefined, docker);
                }
                return Promise.all(Starts.map(x => x()));
            })

            .then((...args) => colog.success('Successfully started: ' + args));
    }


    async ListContainers() {
        const { docker, Params, } = this;
        let ping = false;

        try {
            await docker.ping();
            ping = true;
            console.log('ping success');
        }
        catch (error) {
            if (error.statusCode === 502)
                console.warn('ping', error);
            else
                throw error;
        }

        ping || await init(Params);

        console.log("List containers");
        return docker.listContainers({
            all: true,
            filters: { name: [...Names, "script"] },
        });
    }


    Run() {
        const { docker, Commands, } = this;

        return this.ListContainers()

            .then(Script.bind(undefined, docker))

            .then(Data => {
                console.info("Filter");
                const Containers = Names.map(x => docker.getContainer(x));

                const Filtered = Containers.filter((Container, i) => {
                    const { id } = Container;
                    const data = Data.find(x => x.Names[0].substring(1) == id);
                    Container.Remove = Boolean(data);

                    if (!data)
                        return true;

                    if (RERUN.includes(id)) {
                        console.warn('Container', Container.id, 'to be force removed');
                        return true;
                    }

                    //console.log(data.Labels.COMMAND, Hash(Commands[i]));

                    if (data.Labels.COMMAND !== Hash(Commands[i]))
                        return true;
                    return id === 'script' ? false : data.State !== "running";
                });

                if (!Filtered.length)
                    return colog.success('All containers are running. No action required.');

                colog.answer("Trying container(s):" + Filtered.reduce((accum, { id }) => accum + ' ' + id, ''));
                const Express = Data.find(({ Names: [Name] }) => Name === '/express');
                console.log('Express state:', Express && Express.State);
                return Pull(docker)
                    .then(() => this.main(Filtered, Express && Express.State === 'running'));
            })

            .finally(() => console.info("Finally"));
    }
}


export const DefaultDockerClass = () =>
    import ('./PortainerDocker.js')
    .then(({ DefaultPortainerDocker }) => new DockerClass(DefaultPortainerDocker(), NODE));
IsMain && DefaultDockerClass().then(dockerClass => dockerClass.Run());
