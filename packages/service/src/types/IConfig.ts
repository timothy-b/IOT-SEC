import { LoggerOptions } from 'bunyan';

export type AlertType = 'intruder' | 'departure' | 'arrival' | 'doorOpen';

export interface IEmailConfig {
	from: string;
	ssl: boolean;
	port: number;
	subject: string;
}

export interface EmailAlertMethod {
	type: 'email';
	emailAddress: string;
}

export interface GotifyAlertMethod {
	type: 'gotify';
	url: string;
}

type AlertMethod = (EmailAlertMethod | GotifyAlertMethod) & { name: string; type: string };

export interface User {
	name: string;
	devices: {
		name: string;
		mac: string;
	}[];
	alertMethods?: AlertMethod[];
}

export interface IConfig {
	users: User[];
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
