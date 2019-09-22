const Arpscan = require("arpscan");
const Bunyan = require("bunyan");
const Config = require("./config.js");
const Promise = require('bluebird');

const c_log = Bunyan.createLogger(Config.bunyan);

function getDevicesOnNetwork(callback) {
	const arpscanOptions = {
		interface: "eth0",
		sudo: true
	};
	Arpscan(callback, arpscanOptions);
}

const getDevicesOnNetworkAsync = Promise.promisify(getDevicesOnNetwork);

getDevicesOnNetworkAsync()
	.then(console.log)
	.catch(console.error);
