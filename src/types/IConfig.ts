import { LoggerOptions } from 'bunyan';
import { IDevice } from './IDevice';

export type AlertType = 'intruder' | 'departure' | 'arrival' | 'doorOpen' | 'knownDevice';

export interface IEmailConfig {
	from: string;
	ssl: boolean;
	port: number;
}

export interface IConfig {
	myPortableDevice: IDevice;
	knownPortableDevices?: IDevice[];
	emailServer: {
		user: string;
		password: string;
		host: string;
		ssl: boolean;
	};
	emailRecipients: { [alertType in AlertType]: string[] };
	emailConfig: IEmailConfig;
	okResponseBody: string;
	basicAuthentication: {
		enabled: boolean;
		username: string;
		password: string;
	};
	bunyan: LoggerOptions;
}
