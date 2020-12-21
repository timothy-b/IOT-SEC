import { promisify } from 'util';
import * as Email from 'emailjs';

import { IConfig } from '../types/IConfig';

function sendEmail(email, config: IConfig, callback: (err, result) => void): void {
	const connection = Email.server.connect(config.emailServer);

	connection.send(email, callback);
}

export const sendEmailAsync = promisify<any, IConfig, string>(sendEmail);
