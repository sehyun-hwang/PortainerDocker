import express from 'express';
import DockerClasses from './DockerClasses.js';

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



export const router = express.Router()

    .get('/', (req, res) => res.json(Object.fromEntries(DockerClasses.entries())));
