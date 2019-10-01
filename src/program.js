const Arpscan = require("arpscan");
const Bunyan = require("bunyan");
const Config = require("./config.js");
const Email = require("emailjs");
const Http = require("http");
const Promise = require('bluebird');

const c_log = Bunyan.createLogger(Config.bunyan);

const c_server = Http.createServer(function(request, response) {
	alertIfNotHome(request);

	sendResponse(request, response);
})
	.on('error', (error) => {
		if (error.message.includes("EACCES"))
			c_log.warn("EACCES error - permission denied. You must run the program as admin.")

		c_log.error(error, "server error");
	});

async function alertIfNotHome(request) {
	if (request.method != 'POST')
		return;

	if (Config.basicAuthentication.enabled) {
		const header = request.headers['authorization'] || '',  // get the header
				token = header.split(/\s+/).pop() || '',            // and the encoded auth token
				auth = new Buffer(token, 'base64').toString(),      // convert from base64
				parts = auth.split(/:/),                            // split on colon
				username = parts[0],
				password = parts[1];

		if (username != Config.basicAuthentication.username || password != Config.basicAuthentication.password)
			return;
	}

	setTimeout(() => {
		const detectedDevices = await getDevicesOnNetworkAsync();
		c_log.info({ detectedDevices }, "scanned network");

		const myPortableDevices = detectedDevices.filter(
			d => Config.whitelistedDevices.map(w => w.mac).includes(d.mac));
		
		if (myPortableDevices.length == 0) {
			const connection = Email.server.connect(Config.emailServer);
			connection.send(Config.emailRecipient, function(err, message) {
				if (err) 
					c_log.error(err, "error sending email");
				else
					c_log.info(message, "sending email");
			});
		}

		const knownPortableDevices = detectedDevices.filter(
			d => Config.knownDevices.map(kd => kd.mac).includes(d.mac));

		if (knownPortableDevices.length == 0) {
			const connection = Email.server.connect(Config.emailServer);
			const newEmailRecipient = {
				...Config.emailRecipient,
				text: `${knownPortableDevices.join(', ')} is home.`
			}

			connection.send(newEmailRecipient, function(err, message) {
				if (err) 
					c_log.error(err, "error sending email");
				else
					c_log.info(message, "sending email");
			});
		}
	}, 30000);
}

async function sendResponse(request, response) {
	let body = "";
	request.on("readable", function() {
		body += request.read();
	});

	request.on("end", function() {
		c_log.info({ method: request.method, url: request.url, headers: request.headers, body: body }, "request received");
	});

	response.writeHead(200, {"Content-Type": "text/html"});
	response.write(Config.okResponseBody);
	response.end();
}

function detectDevices(callback) {
	const arpscanOptions = {
		interface: "eth0",
		sudo: true
	};
	Arpscan(callback, arpscanOptions);
}

const getDevicesOnNetworkAsync = Promise.promisify(detectDevices);

function main() {
	c_server.listen(80);
	if (c_server.listening)
		c_log.info("Server is listening");
}

main();
