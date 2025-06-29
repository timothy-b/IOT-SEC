import { SMTPClient, type MessageCallback, type MessageHeaders } from 'emailjs';
import { promisify } from 'util';
import { IConfig } from '../types/IConfig';

function sendEmail(
	email: MessageHeaders,
	config: IConfig,
	callback: MessageCallback<MessageHeaders>
): void {
	const connection = new SMTPClient(config.emailServer);

	connection.send(email, callback);
}

export const sendEmailAsync = promisify(sendEmail);
