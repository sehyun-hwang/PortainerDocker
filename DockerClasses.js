import { NODES } from './CONFIG.js';
import DockersPromise, { Docker } from './Portainer.js';
import DockerClass from './DockerClass.js';


const DockerClasses = new Map();
export default DockerClasses;


DockersPromise.then(() => Promise.allSettled(Object.entries(NODES).map(([Name, Params]) => {
        const x = new DockerClass(Docker(Name), Params);
        return x.Run().then(() => DockerClasses.set(x.docker.Id, x));
    })))

    .then(x => x.filter(x => x.status === 'fulfilled' || console.log(x))
        .map(({ value }) => value))

    .then(() => DockerClasses)
    .catch(console.log);
