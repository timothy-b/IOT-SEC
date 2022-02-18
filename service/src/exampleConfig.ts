import { IConfig } from './types/IConfig';

// fill in the values and rename to config.js
const Config: IConfig = {
	knownPortableDevices: [
		{
			mac: '00:00:00:00:00:00',
			name: 'my phone',
			emailAddress: '5550000000@messaging.carrier.com',
		},
		{
			mac: '11:11:11:11:11:11',
			name: 'my roomate',
			emailAddress: '5551111111@messaging.carrier.com',
		},
	],
	localhost: {
		port: 80,
	},
	emailServer: {
		user: 'user@example.com',
		password: 'password',
		host: 'smtp.example.com',
		ssl: true,
	},
	emailConfig: {
		from: 'Firstname Lastname <user@example.com>',
		ssl: true,
		port: 465,
		subject: '',
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
				stream: process.stdout, // log INFO and above to stdout
				level: 'info',
			},
			{
				type: 'rotating-file',
				level: 'info',
				period: '1d',
				count: 30,
				path: '/var/log/iotsec.log', // log INFO and above to a file
			},
		],
		src: true,
	},
};

export default Config;
