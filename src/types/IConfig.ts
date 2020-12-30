import { LoggerOptions } from 'bunyan';
import { IDevice } from './IDevice';

export type AlertType = 'intruder' | 'departure' | 'arrival' | 'doorOpen';

export interface IEmailConfig {
	from: string;
	ssl: boolean;
	port: number;
}

export interface IConfig {
	knownPortableDevices?: IDevice[];
	localhost: {
		port: number;
	};
	emailServer: {
		user: string;
		password: string;
		host: string;
		ssl: boolean;
	};
	emailConfig: IEmailConfig;
	okResponseBody: string;
	basicAuthentication: {
		enabled: boolean;
		username: string;
		password: string;
	};
	bunyan: LoggerOptions;
}
