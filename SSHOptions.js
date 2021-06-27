import { PathParser } from "utils";

function Log(Title, chunk) {
    const str = chunk.toString();
    console.log(Title, str);
    return str;
}

export default function (stream, error) {
    const options = { stream };
    if (!"stdout stderr both".includes(stream))
        throw new Error("stdio options are not valid");

    const { IsMain, base, App } = error && PathParser(error);
    const Title = IsMain ? base : App;
    if (["stdout", "both"].includes(stream))
        options.onStdout = chunk => Log(`[SSH @ ${Title}]`, chunk);
    if (["stderr", "both"].includes(stream))
        options.onStderr = chunk => Log(`[SSH Error @ ${Title}]`, chunk);

    return options;
}
