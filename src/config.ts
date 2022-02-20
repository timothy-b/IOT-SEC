import { IConfig } from './types/IConfig';

// copy exampleConfig.ts over this file and fill in the values
const Config: IConfig = {
	localhost: {
		port: 0,
	},
	emailServer: {
		user: '',
		password: '',
		host: '',
		ssl: false,
	},
	emailConfig: undefined,
	okResponseBody: '',
	basicAuthentication: {
		enabled: false,
		username: '',
		password: '',
	},
	bunyan: undefined,
};

export default Config;
