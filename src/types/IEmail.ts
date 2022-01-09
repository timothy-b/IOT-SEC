import { IEmailConfig } from './IConfig';

interface IEmail extends IEmailConfig {
	text: string;
	to: string;
}

export default IEmail;
