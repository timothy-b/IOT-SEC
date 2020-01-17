import * as Bunyan from 'bunyan';
import { sendEmail } from './email';
import { IConfig } from "../types/IConfig";
import { IDevice } from '../types/IDevice';
import { arpscanDevicesAsync } from './scanner';

interface IEmail {
	text: string;
	from: string;
	to: string;
	ssl: boolean;
	port: number;
}

export async function runAlerterAsync(config: IConfig, log: Bunyan) {
	const wasIHome = await determineWhetherIAmHomeAsync(config, log)

	log.info('waiting...');
	setTimeout(async () => {
		alertConditionallyAsync(wasIHome, config, log)
	}, 30000);
}

function alert(
	email: IEmail,
	config: IConfig,
	log: Bunyan)
{
	log.info('sending email');

	sendEmail(email, config, (err, result) => {
		log.info(err);
		log.info(result);
	});
}

async function alertConditionallyAsync(wasIHome: boolean, config: IConfig, log: Bunyan) {
	log.info('scanning...');
		const detectedDevices = await arpscanDevicesAsync();

		const detectedMacs = detectedDevices.map(d => d.mac);
		log.info(detectedDevices);

		const myPortableDevices = (config.myPortableDevices || [])
			.filter(wd => detectedMacs.includes(wd.mac));

		log.info(myPortableDevices);

		if (wasIHome && myPortableDevices.length === 0) {
			alertLeftHome(config, log);
		} else if (!wasIHome && myPortableDevices.length !== 0) {
			alertWelcomeHome(config, log);
		} else {
			const knownPortableDevices = (config.knownPortableDevices || [])
				.filter(kd => detectedMacs.includes(kd.mac));

			log.info(knownPortableDevices);

			if (myPortableDevices.length === 0) {
				alertNotHome(knownPortableDevices, config, log);
			}
		}
}

function alertLeftHome(
	config: IConfig,
	log: Bunyan)
{
	const email = {
		...config.emailRecipient,
		text: 'Goodbye.'
	};

	alert(email, config, log);
}

async function alertNotHome(
	detectedKnownPortableDevices: IDevice[],
	config: IConfig,
	log: Bunyan) 
{
	const email = detectedKnownPortableDevices.length !== 0
		? {
				...config.emailRecipient,
				text: `${detectedKnownPortableDevices.map(d => d.name).join(', ')} is home.`,
			}
		: {
			...config.emailRecipient,
			text: 'The fortress is in peril.'
		};

	alert(email, config, log);
}

function alertWelcomeHome(
	config: IConfig,
	log: Bunyan)
{
	const email = {
		...config.emailRecipient,
		text: 'Welcome home.'
	};

	alert(email, config, log);
}

async function determineWhetherIAmHomeAsync(config: IConfig, log: Bunyan): Promise<boolean> {
	const initialDetectedDevices = await arpscanDevicesAsync();
	const detectedMacs = initialDetectedDevices.map(d => d.mac);
	log.info(initialDetectedDevices);

	const initialMyPortableDevices = (config.myPortableDevices || [])
		.filter(wd => detectedMacs.includes(wd.mac));

	return initialMyPortableDevices.length === 1;
}
