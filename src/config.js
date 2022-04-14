'use strict';
exports.__esModule = true;
var Config = {
	knownPortableDevices: [
		{
			mac: '24:46:C8:C1:50:9D',
			name: 'Tim',
			emailAddress: '2149861647@messaging.sprintpcs.com',
		},
		{
			mac: '40:4E:36:89:4F:70',
			name: 'Bryan',
			emailAddress: null,
		},
	],
	localhost: {
		port: 3000,
	},
	emailServer: {
		user: 'tgb.dev.01@gmail.com',
		password: 'D3vG00gl3',
		host: 'smtp.gmail.com',
		ssl: true,
	},
	emailConfig: {
		from: 'Timothy Baumgartner <tgb.dev.01@gmail.com>',
		ssl: true,
		port: 465,
		subject: '',
	},
	okResponseBody:
		'\n\t<!DOCTYPE "html">\n\t<html>\n\t\t<head>\n\t\t\t<title>Hello World Page</title>\n\t\t</head>\n\t\t<body>\n\t\t\tHello World!\n\t\t</body>\n\t</html>\n\t',
	basicAuthentication: {
		enabled: true,
		username: 'iotsec',
		password: 'CNQ62KU65aqTe2LV4Jhwsn6PsSdLzGH4',
	},
	bunyan: {
		name: 'IOTSEC',
		streams: [
			{
				level: 'info',
				stream: process.stdout,
			},
			{
				level: 'info',
				path: '/var/log/iotsec.log',
			},
		],
		src: true,
	},
};
exports['default'] = Config;
