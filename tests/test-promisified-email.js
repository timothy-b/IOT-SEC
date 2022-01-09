const { promisify } = require('util');
const { SMTPClient } = require('emailjs');
const Config = require('../dist/config.js');

function sendEmail(email, config, callback) {
	const connection = new SMTPClient(Config.default.emailServer);

	connection.send(email, callback);
}

const sendEmailAsync = promisify(sendEmail);

(async () => {
	try {
		const message = await sendEmailAsync(
			{
				...Config.default.emailConfig,
				to: Config.default.knownPortableDevices.filter(d => d.name === 'Tim')[0]
					.emailAddress,
				text: 'testing',
			},
			Config.default
		);
		console.log(message);
	} catch (e) {
		console.error(e);
	}
})();
