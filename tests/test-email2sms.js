const email = require('emailjs');
const Config = require('../dist/config.js');

const server = email.server.connect(Config.default.emailServer);

console.log(JSON.stringify(Config));
console.log(JSON.stringify(Config.default.emailRecipient));

// send the message and get a callback with an error or details of the message that was sent
server.send(Config.default.emailRecipient, function(err, message) {
	console.log(err || message);
});
