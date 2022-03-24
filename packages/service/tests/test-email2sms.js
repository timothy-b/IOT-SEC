const { SMTPClient } = require('emailjs');
const Config = require('../dist/config.js');

const connection = new SMTPClient(Config.default.emailServer);

console.log(JSON.stringify(Config));

const message = {
	...Config.default.emailConfig,
	text: 'testing',
	to: 'EMAIL HERE',
	subject: '',
};
console.log(JSON.stringify(message));

// send the message and get a callback with an error or details of the message that was sent
connection.send(message, function(err, msg) {
	console.log(err || msg);
});
