import { readFile, truncate } from "fs";
import http from 'http';
import https from 'https';
import express from "express";
import cors from 'cors';
import net from 'net';
import proxy from 'http-proxy-middleware';
import _ from 'lodash';

const app = express()

    //.use(cors({  origin: 'https://www.hwangsehyun.com'}))

    .use('/socket.io',
        //cors({    origin: 'https://www.hwangsehyun.com'}),
        ({ method, query: { Container }, originalUrl, headers, rawHeaders, socket }) => {
            console.log('Socket.IO Connection to', originalUrl, Container);
            const proxy = net.connect({
                    host: 'localhost', //Container + '.network',
                    port: 8081
                })
                .on('error', console.log);

            socket.pipe(proxy);
            socket.pipe(process.stdout);
            proxy.pipe(socket);
            proxy.pipe(process.stdout);

            proxy.write([method, originalUrl, 'HTTP/1.1\r\n'].join(' '));
            //console.log(headers);
            //proxy.write(_.chunk(rawHeaders, 2).map(([a, b]) => `${a}: ${b}`).join('\r\n'));
            proxy.write('\r\n\r\n');
        }, //(req, res) => res.set('Access-Control-Allow-Credentials', 'true')
    )

    .use("/pgadmin", proxy.createProxyMiddleware({
        target: "http://pgadmin.socat",
        onProxyReq: proxyReq => {
            proxyReq.setHeader("X-Script-Name", '/pgadmin');
            proxyReq.setHeader("X-Scheme", "https");
        }
    }));

http.createServer(app)
    .on('upgrade', (req) => {
        const { method, url, headers, rawHeaders, socket } = req;
        console.log('Socket.IO Upgrade Connection to', url);
        const proxy = net.connect({
                host: 'localhost', //Container + '.network',
                port: 8081
            })
            .on('error', console.log);

        proxy.write([method, url, 'HTTP/1.1\r\n'].join(' '));
        //console.log(method, _.chunk(rawHeaders, 2).map(([a, b]) => `${a}: ${b}`).join('\r\n'));
        proxy.write(_.chunk(rawHeaders, 2).map(([a, b]) => `${a}: ${b}`).join('\r\n'));
        proxy.write('\r\n\r\n');

        socket.pipe(proxy);
        socket.pipe(process.stdout);
        proxy.pipe(socket);
        proxy.pipe(process.stdout);
    })
    .listen(8080, "0.0.0.0", function () {
        console.log(this.address());
    });

process.getuid() || readFile("cert.pem", (error, cert) => error ? console.log(error) :
    https.createServer({
        key: cert,
        cert
    }, app)
    .on("error", console.log)
    .on('upgrade', (a, b, c) => console.log())
    .listen(443, "0.0.0.0", function () {
        truncate("cert.pem", console.log);
        console.log(this.address());
    }));
