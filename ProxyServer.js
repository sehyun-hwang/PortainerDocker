import http from 'http';
import https from 'https';

import { MyURL } from "utils";

export const port = 2375;

export default new Promise((resolve, reject) => http.createServer((req, res) => {
        const { url, method, headers } = req;

        if (url === "/_ping") {
            res.statusCode = 204;
            return res.end();
        }

        const { hostname } = MyURL[headers["x-subdomain"] || 'nextlab'];
        headers.host = hostname;
        const Log = arg => console.log(hostname + url, arg);

        req.pipe(https.request({
            hostname,
            port: 2376,
            path: url,
            method,
            headers,
        }, proxy_res => {
            const { headers, statusCode } = proxy_res;
            Log(statusCode);
            proxy_res.pipe(res);
            res.writeHead(statusCode, headers);

            if (!url.includes("/attach?")) return;
            res.write("\r\n");
            req.pipe(proxy_res.socket, { end: false });
            proxy_res.socket.pipe(res, { end: false });
            [req, res, proxy_res].forEach(x => x.socket.setKeepAlive(true, 60000));
        }).on('error', ({ code }) => {
            Log(code);
            res.writeHead({
                EPROTO: 502,
                ECONNREFUSED: 502,
                ECONNRESET: 502,
                EHOSTUNREACH: 503,
                ETIMEDOUT: 504,
            }[code] || 500);
            res.end(code);
        }));
    })
    .on("error", reject)
    .listen(port, "127.0.0.1", function () {
        console.log("Listening on:", this.address());
        resolve(this);
    })
);
