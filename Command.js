import { hostname as Host } from 'os';
import _ from "lodash";

const DOMAIN = Host().replace('www.', '');

export const Commands = [{
    Image: "centos",
    name: "centos",
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

export const Names = Commands.map(x => x.name);
console.log({ Names });

export const Command = (Root, command) => {
    if (command && command.Cmd);
    else {
        const Cmd = ["sh", "Docker.sh"];
        command && Cmd.push(command.name || command.Labels.APP);
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
                'DOMAIN=' + DOMAIN
                /*'PIP_INDEX_URL=http://apt.network:3141/simple/',
                'PIP_TRUSTED_HOST=apt.network',*/
            ],
        }, command,
        (objValue, srcValue) => Array.isArray(objValue) ? objValue.concat(srcValue) : undefined);

    const { Binds } = Return.HostConfig;
    Binds.forEach((x, i) => {
        if (!x.startsWith('$'))
            return;
        Binds[i] = x.replace('$', Root);
    });

    //console.log(Return);
    return Return;
};
