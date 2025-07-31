import { LoggerOptions } from 'bunyan';

export type AlertType = 'intruder' | 'departure' | 'arrival' | 'doorOpen';

export interface EmailAlertMethod {
	type: 'email';
	emailAddress: string;
}

export interface GotifyAlertMethod {
	type: 'gotify';
	url: string;
	apiKey: string;
}

type AlertMethod = (EmailAlertMethod | GotifyAlertMethod) & { name: string; type: string };

export interface IDevice {
	mac: string;
	name: string;
}

export interface User {
	name: string;
	devices: IDevice[];
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
		port: number;
	};
	emailConfig: {
		from: string;
		subject: string;
	};
	// TODO: make it a whole calendar, not just an event
	// sync with GCal maybe?
	alertVEvent: string | null;
	okResponseBody: string;
	basicAuthentication: {
		enabled: boolean;
		username: string;
		password: string;
	};
	bunyan: LoggerOptions;
}
