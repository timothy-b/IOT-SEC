const arpscan = require("arpscan");
const bunyan = require("bunyan");
const email = require("emailjs");
const http = require("http");
const Config = require("./config.js");

const c_log = bunyan.createLogger(Config.bunyan);

const c_server = http.createServer(function(request, response) {
	alertIfNotHome(request);

	c_log.info({ method: request.method, url: request.url });

	sendResponse(request, response);
})
	.on('error', (error) => {
		if (error.message.includes("EACCES"))
			c_log.warn("EACCES error - permission denied. You must run the program as admin.")

		c_log.error(error);
	});

async function alertIfNotHome(request) {
	if (request.method != 'POST')
		return;

	if (Config.basicAuthentication.enabled) {
		const header = request.headers['authorization']||'',  // get the header
				token = header.split(/\s+/).pop()||'',            // and the encoded auth token
				auth = new Buffer(token, 'base64').toString(),    // convert from base64
				parts = auth.split(/:/),                          // split on colon
				username = parts[0],
				password = parts[1];

		if (username != Config.basicAuthentication.username || password != Config.basicAuthentication.password)
			return;
	}

	const devices = getDevicesOnNetwork();
	c_log.info({ devicesOnNetwork: devices });

	let = whitelistedDevicesDetected = [];
	for (let d in devices)
		if (Config.whitelistedDevices.map(w => w.mac).includes(devices[d].mac))
			whitelistedDevicesDetected.push(devices[d]);

	if (whitelistedDevicesDetected.length == 0) {
		const connection = email.server.connect(Config.emailServer);
		connection.send(Config.emailRecipient, function(err, message) { console.log(err || message); });
	}
}

async function sendResponse(request, response) {
	let body = "";
	request.on("readable", function() {
		body += request.read();
	});

	request.on("end", function() {
		c_log.info(body);
	});

	response.writeHead(200, {"Content-Type": "text/html"});
	response.write(Config.okResponseBody);
	response.end();
}

function getDevicesOnNetwork() {
	const arpscanOptions = {
		interface: "eth0",
		sudo: true
	};

	return arpscan(function(err, data) {
		if (err)
			c_log.error(data);

		return data;
	}, arpscanOptions);
}

async function main() {
	await c_server.listen(80);
	if (c_server.listening)
		c_log.info("Server is listening");
}

main();
