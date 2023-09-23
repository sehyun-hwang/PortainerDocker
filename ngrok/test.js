import ngrok from 'ngrok';

const api = await ngrok.getApi();
const tunnels = await api.listTunnels();
console.log(tunnels);