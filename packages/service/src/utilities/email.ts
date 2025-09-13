import { SMTPClient, type Message, type MessageHeaders } from 'emailjs';
import { IConfig } from '../types/IConfig';

async function sendEmailAsync(email: MessageHeaders, config: IConfig): Promise<Message> {
	const connection = new SMTPClient(config.emailServer);

	return await connection.sendAsync(email);
}

export { sendEmailAsync };
