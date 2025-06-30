import ping from 'ping';

const pingResult = await ping.promise.probe('10.0.0.239');

console.log(pingResult);
