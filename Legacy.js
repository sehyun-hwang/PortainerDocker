IsYonsei ? [{
    Image: "mrtux/apt-cacher-ng",
    name: "apt",
    ExposedPorts: {
        '3141/tcp': {},
        '3142/tcp': {},
    },
    HostConfig: {
        PortBindings: {
            '3141/tcp': [{
                HostIp: "",
                HostPort: '3141',
            }],
            '3142/tcp': [{
                HostIp: "",
                HostPort: '3142',
            }],
        },
        RestartPolicy: { Name: "unless-stopped" },
        Binds: ["/Volumes/dev/apt:/var/cache/apt-cacher-ng"]
    }
}] : []
`docker run -d --name apt \
--restart unless-stopped \
-p 3141:3141 -p 3142:3142 \
-v /Volumes/dev/apt:/var/cache/apt-cacher-ng \
-v /Volumes/dev/pip:/root/.devpi/server/+files/root \
mrtux/apt-cacher-ng
`
let Finally;

async function NewTemp() {
    console.log("NewTemp");

    await ssh.connect({
        localhost: {
            host: "localhost",
            username: "admin",
            privateKey: `/home/${process.env.USER}/.ssh/Default.pem`,
        }
    }[Subdomain] || {
        host: MyURL[Subdomain].hostname,
        username: "hwangsehyun",
        privateKey: `/home/${process.env.USER}/.ssh/id_rsa`,
    });

    const temp = await SSL.then(async stdin => {
        console.log("Cert files read");

        const temp = await ssh.exec("mktemp", []);
        await ssh.execCommand("cat - >> " + temp, { stdin });
        return Subdomain === "yonsei" ? "/private" + temp : temp;
    });
    console.log({ temp });

    Finally = () => new Promise(resolve => {
            console.log("temp file truncating");
            Temp = TempOnce;
            setTimeout(resolve, 10000);
        })
        .then(() => ssh.execCommand(': > temp'))
        .then(() => {
            console.log("temp file truncated");
            ssh.dispose();
        });

    return temp;
}

const TempOnce = () => {
    console.log("TempOnce");
    Finally = () => console.log("Finally");

    const promise = NewTemp();
    Temp = () => promise;
    return promise;
};

let Temp = TempOnce;
