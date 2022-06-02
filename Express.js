process.env.DEBUG='http-proxy-middleware*';

import { readFile } from "fs";
import { promises as _dns } from 'dns';
const { lookup: dns } = _dns;

import https from 'https';
import http from 'http';

import express from "express";
import morgan from 'morgan';
import cors from 'cors';
import proxy from 'http-proxy-middleware';
import { Server as IO } from 'socket.io';
import { io as IOClient } from 'socket.io-client';
import got from 'got';

const app = express();
export default app;

app
    .use(morgan('combined', {
        skip: ({ ip }) => ip === '127.0.0.1'
    }))
    .use(cors({
        origin: [
            /https:\/\/\w+.hwangsehyun.com/,
            "http://localhost:4000",
            "https://nextlab.s3.ap-northeast-2.amazonaws.com",
            'https://dev-kococo.ngrok.io',
        ]
    }));


{
    const onError = (error, req, res, { href }) => {
        console.log(error);
        res.status(502).json({ error, href });
    };

    app.use(proxy.createProxyMiddleware((path, { headers }) =>

            headers.referer === 'https://proxy.hwangsehyun.com/portainer/' ||
            /^Go-http-client|Dockerode/.test(headers['user-agent']), {
                target: "https://portainer-agent.network:9001",
                secure: false,
                ws: true,
                onError,
            }))


        .use(proxy.createProxyMiddleware((path, req) =>
            /^(containers|docker|Buildah)\//.test(req.headers['user-agent']) || req.headers['user-agent'].startsWith('Faraday'), {
                target: "http://registry.network:5000",
                onError,
            }));
}


app
    .use((req, res, next) => {
        //console.log(req.headers);

        const { host, 'x-forwarded-proto': forwareded } = req.headers;
        const { encrypted } = req.socket;
        (encrypted || forwareded === 'https' || (host && host.endsWith('.network')) || host === 'localhost') ?
        next(): res.redirect(301, 'https://' + host + req.url);
    })


    .get('/', (req, res) => res.status(204).send())

    .use('/onvif', proxy.createProxyMiddleware({
        changeOrigin: true,
        target: "http://192.168.10.176",
    }))

    .use('/meshlab', proxy.createProxyMiddleware({
        target: "http://meshlab.network:8000",
    }))

    .use('/s3', proxy.createProxyMiddleware({
        target: "http://s3.network:4568",
        pathRewrite: {
            '^/s3': '/',
        },
    }))

    .use(/^\/nas(.*)/, ({ params }, res) => {
        try {
            got.stream("http://ds920p.local:8000" + params[0]).pipe(res);
        }
        catch (error) {
            console.log(new Error(error));
            res.status(500).json(error);
        }
    })

    .use("/3dprinter", proxy.createProxyMiddleware({
        target: "http://192.168.0.210",
        changeOrigin: true,
        pathRewrite: {
            '^/3dprinter': '/',
        },
    }))

    .use('/_kiwi', (req, res, next) => req._parsedUrl.pathname === '/_kiwi' ? res.redirect('/_kiwi/index.do') : next())

    .use("/_*", proxy.createProxyMiddleware({
        target: "https://devcms.yonsei.ac.kr",
        changeOrigin: true,
        /*onProxyReq: proxyReq => {
            proxyReq.setHeader("X-Script-Name", '/pgadmin');
            proxyReq.setHeader("X-Scheme", "https");
        }*/
    }));

export const io_client = IOClient('https://proxy.hwangsehyun.com')
    .on('connect', () => console.log('Connected to server'));

function RemoteLog(...data) {
    console.log(...data);
    io_client.emit('Log', ...data);
}
const io = new IO();

io.on('connection', socket => {
    process.stdout.write(`Connection ${socket.id} `);
    socket.on('Log', RemoteLog);
});

/*let EV3res, angles;
app.get('/ev3', (req, res) => {
    EV3res && clearInterval(EV3res.Interval);
    EV3res = res;
    res.Interval = setInterval(() => {
        angles && res.write(angles);
        res.write('\n');
    }, 100);
});

io.of('/EV3').on('connection', socket => socket.on('Angles', Angles => {
    console.log(Angles);
    if (!EV3res) return;
    angles = JSON.stringify(Angles);
}));*/

const Intervals = new Map();

const Handler = (src, dsc) => io.of(src).on('connection', socket => {
    const { Container, KeepAlive } = socket.handshake.query;
    console.log(src, Container);
    socket.join(Container);
    socket.on('Room', data => {
        console.log(src, socket.id, 'Manually joining room', data);
        socket.join(data);
    });

    const Clients = namespace => io.of(namespace).to(Container).allSockets();

    const Handler = (event, ...data) => Clients(dsc).then((sids) => sids.forEach(sid => {
        if (!sid) {
            console.log('No socket to emit');
            return;
        }

        console.log('Emitting', event, 'to', dsc, Container);
        io.of(dsc).sockets.get(sid).emit(event, data, data => {
            if (!data)
                return;

            console.log('Emitting', event, 'to', src, Container);
            //console.log(data);
            socket.emit(event, data);
        });
    }));

    if (src === '/Container') {
        console.log("Setting interval for", Container);
        const Room = io.of(dsc).to(Container);
        Intervals.set(Container, setInterval(() => Room.emit('ContainerConnect'), 3000));
    }

    socket.on('Container', Handler);
    socket.on('disconnect', () => console.log('Disconnected', socket.id, src, Container));

    function Disconnect() {
        console.log('Disconnecting', src, Container);
        socket.disconnect(true);
    }

    function OnError(error) {
        if (!error) return;
        else if (error.code === 'ENOTFOUND') Disconnect();
        else console.log(error);
    }


    ({
        "/Browser": () => new Promise(resolve => setTimeout(resolve, 1000))
            .then(() => dns(Container + '.network'))
            .then(() => new Promise(resolve => socket.on('disconnect', resolve)))

            .then(Clients.bind(undefined, src))
            .then(clients => clients.length || Promise.reject())

            .then(Clients.bind(undefined, dsc))
            .then(([sid]) => {
                console.log('Disconnecting', sid);
                io.of(dsc).sockets.get(sid).disconnect(true);
            })

            .catch(OnError),


        '/Container': () => Clients(dsc)
            .then(clients => {
                socket.on('disconnect', function () {
                    console.log('Clearing interval for', Container);
                    clearInterval(Intervals.get(Container));
                    Intervals.delete(Container);
                });
                return KeepAlive || clients.size || Promise.reject(Disconnect());
            })
            .then(() => new Promise(resolve => socket.on('disconnect', resolve)))
            .then(Clients.bind(undefined, dsc))
            .then(clients => {
                console.log("Disconnecting", clients);
                const { sockets } = io.of(dsc);
                clients.forEach(x => sockets.get(x).disconnect(true));
            }).catch(OnError),
    })[src]();
});

Handler('/Browser', '/Container');
Handler('/Container', '/Browser');

const UID = process.getuid();

const Listen = (Options = null) => io.listen(
    (Options ? https : http).createServer(Options, app)
    .on("error", RemoteLog)
    .listen(Options ? 443 : 80, "0.0.0.0", function () {
        RemoteLog('Listening:', Options ? 'https' : 'http', this.address());
    })
);



let mainFile = process.argv[1];
if (!mainFile.endsWith('js'))
    mainFile += '/index.js';

const isMain = url => mainFile === new URL(url).pathname;
if (isMain(
        import.meta.url)) {

    UID ? io.listen(8083) : Listen();

    UID || readFile("/cert/cert.pem", (error, cert) => error ? RemoteLog(error) : Listen({
        key: cert,
        cert,
    }));
}
