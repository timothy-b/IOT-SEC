const email = require("emailjs");
const server = email.server.connect({
	user: "user@mailservice.com", 
	password: `your password here`, 
	host: "smtp.mail.com", 
	ssl: true
});

// send the message and get a callback with an error or details of the message that was sent
server.send({
	 text: "Test email2sms", 
	 from: "User Name <user@mailservice.com>", 
	 to: "5555555555@carrier.address.com",
	 ssl: true,
	 port: 465
}, function(err, message) { console.log(err || message); });
