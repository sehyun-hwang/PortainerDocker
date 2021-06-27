import { exec } from "child_process";
import { Writable } from "stream";

import { PathParser } from "utils";

export const All = new Promise((resolve, reject) => exec("sudo bash -c 'cat /volatile/letsencrypt/live/hwangsehyun.com/{fullchain.pem,privkey.pem}'", {
    shell: true
}, (error, stdout, stderr) => (error || stderr) ? reject({ error, stderr }) : resolve(stdout)));

export default All;

PathParser(
        import.meta.url).IsMain && All
    .then(Writable.prototype.write.bind(process.stdout))
    .catch(console.log);
