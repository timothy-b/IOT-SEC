import { IConfig } from './types/IConfig';

// fill in the values and rename to config.js
const Config: IConfig = {
	users: [
		{
			name: 'Alice',
			devices: [
				{
					name: 'Pixel',
					mac: '00:00:00:00:00:00',
				},
			],
			alertMethods: [
				{
					name: "Alice's Gotify",
					type: 'gotify',
					url: 'https://example.com/gotify/',
				},
				{
					name: "Alice's Email",
					type: 'email',
					emailAddress: '5555555555@sprintpcs.com',
				},
			],
		},
		{
			name: 'Bob',
			devices: [
				{
					name: "Bob's Pixel",
					mac: 'FF:FF:FF:FF:FF:FF',
				},
			],
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
