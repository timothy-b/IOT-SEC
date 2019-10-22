import { promisify } from 'util';
import * as Bunyan from 'bunyan';
import * as Email from 'emailjs';

import { IConfig } from '../types/IConfig';

export const sendEmail = (email, config: IConfig, callback: (err, result) => void): void => {
	const connection = Email.server.connect(config.emailServer);

	connection.send(email, callback);
};

export const sendEmailAsync = promisify<any, IConfig, Bunyan>(sendEmail);
