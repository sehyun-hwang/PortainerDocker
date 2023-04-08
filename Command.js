import _ from "lodash";
import { HOST } from './CONFIG.js';


export const Commands = [{
    Image: "quay.io/centos/centos:stream9-minimal",
    name: "centos",
    Cmd: ["sleep", "infinity"]
}, {
    Image: 'node:alpine',
    name: "express",
    ExposedPorts: {
        '80/tcp': {},
        '443/tcp': {}
    },
    Healthcheck: {
        Test: ["CMD", "wget", "localhost", "-O", "/dev/null"]
    },
    HostConfig: {
        PortBindings: {
            '80/tcp': [{
                HostIp: "",
                HostPort: '80',
            }],
            '443/tcp': [{
                HostIp: "",
                HostPort: '443',
            }],
        },
        RestartPolicy: { Name: "unless-stopped" },
        Binds: [
            "cert:/cert:ro",
            "$/node_modules:/root/node_modules:ro",
        ]
    },
}];

export const IMAGES = Commands.map(({ Image }) => Image).concat('alpine alpine/socat docker'.split(' '));
export const Names = Commands.map(x => x.name);
console.table({ IMAGES, Names });


export const CommandFactory = (Root, command) => {
    if (command && command.Cmd);
    else {
        const Cmd = ["sh", "Docker.sh"];
        command && Cmd.push(command.name || command.Labels && command.Labels.APP);
        command = { ...command, ...{ Cmd } };
    }

    const Return = _.mergeWith({
            Labels: { APP: command && command.name },
            WorkingDir: "/root",
            HostConfig: {
                Binds: ["$/Docker.sh:/root/Docker.sh"],
                NetworkMode: "network",
                //StorageOpt: { size: '1G' }
            },
            Env: [
                'HOST=' + HOST
                /*'PIP_INDEX_URL=http://apt.network:3141/simple/',
                'PIP_TRUSTED_HOST=apt.network',*/
            ],
        }, command,
        (objValue, srcValue) => Array.isArray(objValue) ? objValue.concat(srcValue) : undefined);

    const { Binds } = Return.HostConfig;
    Binds.forEach((x, i) => {
        if (x.startsWith('$'))
            Binds[i] = x.replace('$', Root);
    });

    //console.log(Return);
    return Return;
};
