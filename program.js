const arpscan = require("arpscan");
const email = require("emailjs");
const http = require("http");

const whitelistedDevices = [
	{
		mac: "00:00:00:00:00:00",
		name: "my phone"
	}
];

const emailServerConfig = {
	user: "user@mailservice.com", 
	password: `your password here`, 
	host: "smtp.mail.com", 
	ssl: true
};

const emailRecipientConfig = {
	text: "Test email2sms", 
	from: "User Name <user@mailservice.com>", 
	to: "5555555555@carrier.address.com",
	ssl: true,
	port: 465
};

const okResponseBody = `
<!DOCTYPE "html">
<html>
	<head>
		<title>Hello World Page</title>
	</head>
	<body>
		Hello World!
	</body>
</html>
`;

const server = http.createServer(function(request, response) {
	alertIfNotHome();

	console.info(`method: ${request.method}`);
	console.info(`url: ${request.url}`);

	let body = "";
	request.on("readable", function() {
		body += request.read();
	});

	request.on("end", function() {
		console.info(body);
	});

	response.writeHead(200, {"Content-Type": "text/html"});
	response.write(okResponseBody);
	response.end();
});

const alertIfNotHome = async function() {
	const devices = getDevicesOnNetwork();
	console.info(devices);

	let = whitelistedDevicesDetected = [];
	for (let d in devices)
		if (whitelistedDevices.map(w => w.mac).includes(devices[d].mac))
			whitelistedDevicesDetected.push(devices[d]);

	if (whitelistedDevicesDetected.length == 0)
		sendTextMessage();
}

const getDevicesOnNetwork = function() {
	const arpscanOptions = {
		interface: "eth0",
		sudo: true
	};

	return arpscan(function(err, data) {
		if (err)
			console.error(data);

		console.info(JSON.stringify(data));

		return data;
	}, arpscanOptions);
}

const sendTextMessage = function() {
	const connection = email.server.connect(emailServerConfig);
	connection.send(emailRecipientConfig, function(err, message) { console.log(err || message); });
}

server.listen(80);
console.info("Server is listening");
