import Arpscan from 'arpscan';
import * as Bunyan from 'bunyan';
import { Config, IDevice } from './config.js';
import Email from 'emailjs';
import * as Http from 'http';
import { promisify } from 'util';

const c_log = Bunyan.createLogger(Config.bunyan);

const c_server = Http.createServer((request, response) => {
	alertIfNotHome(request);

	sendResponse(request, response);
}).on('error', error => {
	if (error.message.includes('EACCES')) {
		c_log.warn('EACCES error - permission denied. You must run the program as admin.');
	}

	c_log.error(error, 'server error');
});

async function alertIfNotHome(request: Http.IncomingMessage) {
	if (request.method !== 'POST') {
		return;
	}

	if (Config.basicAuthentication.enabled) {
		const header = request.headers.authorization || ''; // get the header
		const token = header.split(/\s+/).pop() || ''; // and the encoded auth token
		const auth = new Buffer(token, 'base64').toString(); // convert from base64
		const [username, password] = auth.split(/;/); // split on colon

		if (
			username !== Config.basicAuthentication.username ||
			password !== Config.basicAuthentication.password
		) {
			return;
		}
	}

	setTimeout(async () => {
		const detectedDevices = await getDevicesOnNetworkAsync();
		c_log.info({ detectedDevices }, 'scanned network');

		const myPortableDevices = detectedDevices.filter(d =>
			Config.whitelistedDevices.map(w => w.mac).includes(d.mac)
		);

		if (myPortableDevices.length === 0) {
			const connection = Email.server.connect(Config.emailServer);
			connection.send(Config.emailRecipient, (err, message) => {
				if (err) {
					c_log.error(err, 'error sending email');
				} else {
					c_log.info(message, 'sending email');
				}
			});
		}

		const knownPortableDevices = detectedDevices.filter(d =>
			Config.knownDevices.map(kd => kd.mac).includes(d.mac)
		);

		if (knownPortableDevices.length === 0) {
			const connection = Email.server.connect(Config.emailServer);
			const newEmailRecipient = {
				...Config.emailRecipient,
				text: `${knownPortableDevices.join(', ')} is home.`,
			};

			connection.send(newEmailRecipient, (err, message) => {
				if (err) {
					c_log.error(err, 'error sending email');
				} else {
					c_log.info(message, 'sending email');
				}
			});
		}
	}, 30000);
}

async function sendResponse(request: Http.IncomingMessage, response: Http.ServerResponse) {
	let body = '';
	request.on('readable', () => {
		body += request.read();
	});

	request.on('end', () => {
		c_log.info(
			{
				method: request.method,
				url: request.url,
				headers: request.headers,
				body,
			},
			'request received'
		);
	});

	response.writeHead(200, { 'Content-Type': 'text/html' });
	response.write(Config.okResponseBody);
	response.end();
}

function detectDevices(callback: (err: Error, result: IDevice[]) => void) {
	const arpscanOptions = {
		interface: 'eth0',
		sudo: true,
	};
	Arpscan(callback, arpscanOptions);
}

const getDevicesOnNetworkAsync = promisify<IDevice[]>(detectDevices);

function main() {
	c_server.listen(80);
	if (c_server.listening) {
		c_log.info('Server is listening');
	}
}

main();
