import { SMTPClient } from 'emailjs';
import { promisify } from 'util';
import { IConfig } from '../types/IConfig';
import IEmail from '../types/IEmail';

function sendEmail(email: IEmail, config: IConfig, callback: (err, result) => void): void {
	const connection = new SMTPClient(config.emailServer);

	connection.send(email, callback);
}

export const sendEmailAsync = promisify<IEmail, IConfig, string>(sendEmail);
