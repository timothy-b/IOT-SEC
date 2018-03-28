const arpscan = require("arpscan");
const bunyan = require("bunyan");
const email = require("emailjs");
const http = require("http");
const Config = require("./config.js");

var log = bunyan.createLogger({
  name: 'IOTSEC',
  streams: [
    {
      level: 'info',
      stream: process.stdout	// log INFO and above to stdout
    },
    {
      level: 'warn',
      path: '/var/iotsec.log'	// log ERROR and above to a file
    }
  ]
});

const server = http.createServer(function(request, response) {
	alertIfNotHome(request);

	log.info(`method: ${request.method}`);
	log.info(`url: ${request.url}`);

	sendResponse(request, response);
});

const alertIfNotHome = async function(request) {
	if (request.method != 'POST')
		return;

	const header = request.headers['authorization']||'',  // get the header
			token = header.split(/\s+/).pop()||'',            // and the encoded auth token
			auth = new Buffer(token, 'base64').toString(),    // convert from base64
			parts = auth.split(/:/),                          // split on colon
			username = parts[0],
			password = parts[1];

	if (username != Config.basicAuthentication.username || password != Config.basicAuthentication.password)
		return;

	const devices = getDevicesOnNetwork();
	log.info(devices);

	let = whitelistedDevicesDetected = [];
	for (let d in devices)
		if (Config.whitelistedDevices.map(w => w.mac).includes(devices[d].mac))
			whitelistedDevicesDetected.push(devices[d]);

	if (whitelistedDevicesDetected.length == 0) {
		const connection = email.server.connect(Config.emailServer);
		connection.send(Config.emailRecipient, function(err, message) { console.log(err || message); });
	}
}

const sendResponse = async function(request, response) {
	let body = "";
	request.on("readable", function() {
		body += request.read();
	});

	request.on("end", function() {
		log.info(body);
	});

	response.writeHead(200, {"Content-Type": "text/html"});
	response.write(Config.okResponseBody);
	response.end();
}

const getDevicesOnNetwork = function() {
	const arpscanOptions = {
		interface: "eth0",
		sudo: true
	};

	return arpscan(function(err, data) {
		if (err)
			log.error(data);

		log.info(JSON.stringify(data));

		return data;
	}, arpscanOptions);
}

server.listen(80);
log.info("Server is listening");
