import { promisify } from 'util';
import * as Bunyan from 'bunyan';
import Email from 'emailjs';

import { IConfig } from '../types/IConfig';

export const sendEmailAsync = async (email, config: IConfig, log: Bunyan):
	Promise<void> =>
{
	const connection = Email.server.connect(config.emailServer);
	
	return promisify<void>(connection.send(email, (err, msg) => {
		if (err) {
			log.error(err, 'error sending email');
		} else {
			log.info(msg, 'sending email');
		}
	}))();
};
