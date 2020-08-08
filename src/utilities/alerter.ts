import * as Bunyan from 'bunyan';
import { sendEmail } from './email';
import { IConfig } from '../types/IConfig';
import { IDevice } from '../types/IDevice';
import { arpscanDevicesAsync } from './scanner';

interface IEmail {
	text: string;
	from: string;
	to: string;
	ssl: boolean;
	port: number;
}

export function createAlerter(config: IConfig, log: Bunyan) {
	async function runAlerterAsync() {
		const iAmHome = await determineWhetherIAmHomeAsync();

		setTimeout(async () => {
			await alertConditionallyAsync(iAmHome);
		}, 30000);
	}

	function alert(email: IEmail) {
		log.debug('sending email');

		sendEmail(email, config, (err, result) => {
			if (err) {
				log.error(err);
			} else {
				log.info({ email: result });
			}
		});
	}

	async function alertConditionallyAsync(iWasHome: boolean) {
		const detectedDevices = await arpscanDevicesAsync();
		log.info({ detectedDevices });

		const detectedMacs = new Set(detectedDevices.map(d => d.mac));

		const iAmHome = detectedMacs.has(config.myPortableDevice.mac);

		if (iWasHome && !iAmHome) {
			alertGoodbye();
		} else if (!iWasHome && iAmHome) {
			alertWelcomeHome();
		} else {
			const knownPortableDevices = (config.knownPortableDevices || []).filter(kd =>
				detectedMacs.has(kd.mac)
			);

			if (iWasHome && iAmHome) {
				alertSomeoneHome(knownPortableDevices);
			} else if (!iWasHome && !iAmHome) {
				log.info({ knownPortableDevices });

				if (knownPortableDevices.length === 0) {
					alertNobodyHome();
				} else {
					alertSomeoneHome(knownPortableDevices);
				}
			}
		}
	}

	function alertGoodbye() {
		const email = {
			...config.emailRecipient,
			text: 'Goodbye.',
		};

		alert(email);
	}

	function alertWelcomeHome() {
		const email = {
			...config.emailRecipient,
			text: 'Welcome home.',
		};

		alert(email);
	}

	async function alertSomeoneHome(detectedKnownPortableDevices: IDevice[]) {
		const grammar = detectedKnownPortableDevices.length > 1 ? 'are' : 'is';

		const email = {
			...config.emailRecipient,
			text: `${detectedKnownPortableDevices.map(d => d.name).join(', ')} ${grammar} home.`,
		};

		alert(email);
	}

	async function alertNobodyHome() {
		const email = {
			...config.emailRecipient,
			text: 'The fortress is in peril.',
		};

		alert(email);
	}

	async function determineWhetherIAmHomeAsync(): Promise<boolean> {
		const detectedDevices = await arpscanDevicesAsync();
		log.info({ detectedDevices });

		const detectedMacs = new Set(detectedDevices.map(d => d.mac));

		return detectedMacs.has(config.myPortableDevice.mac);
	}

	return { runAlerterAsync };
}
