const email = require("emailjs");
const Config = require("../config.js");

const server = email.server.connect(Config.emailServer);

// send the message and get a callback with an error or details of the message that was sent
server.send(Config.emailRecipient, function(err, message) { console.log(err || message); });
