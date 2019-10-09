import { IConfig } from "./types/IConfig";

// fill in the values and rename to config.js
const Config: IConfig = {
	myPortableDevices: [
		{
			mac: '00:00:00:00:00:00',
			name: 'my phone',
		},
	],
	knownPortableDevices: [
		{
			mac: '11:11:11:11:11:11',
			name: 'my roomate',
		},
	],
	emailServer: {
		user: 'user@example.com',
		password: 'password',
		host: 'smtp.example.com',
		ssl: true,
	},
	emailRecipient: {
		text: 'The fortress is in peril.',
		from: 'Firstname Lastname <user@example.com>',
		to: '5555555555@messaging.carrier.com',
		ssl: true,
		port: 465,
	},
	okResponseBody: `
	<!DOCTYPE "html">
	<html>
		<head>
			<title>Hello World Page</title>
		</head>
		<body>
			Hello World!
		</body>
	</html>
	`,
	basicAuthentication: {
		enabled: true,
		username: 'photon',
		password: 'pass',
	},
	bunyan: {
		name: 'IOTSEC',
		streams: [
			{
				level: 'info',
				stream: process.stdout,
			},
			{
				level: 'warn',
				path: './iotsec.log',
			},
		],
	},
};

export default Config;
