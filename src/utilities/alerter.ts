import * as Bunyan from 'bunyan';
import { sendEmail } from './email';
import { IConfig, IEmailConfig, AlertType } from '../types/IConfig';
import { IDevice } from '../types/IDevice';
import { arpscanDevicesAsync } from './scanner';

const defaultAlertMessages: { [alertType in AlertType]: string } = {
	intruder: 'The fortress is in peril.',
	departure: 'Goodbye.',
	arrival: 'Welcome home.',
	doorOpen: 'The door is open.',
	knownDevice: 'A recognized device arrived.',
}

const alertTypes = Object.keys(defaultAlertMessages).reduce((map, key) => ({ ...map, [key]: key }), {}) as { [alertType in AlertType]: AlertType };

interface IEmail extends IEmailConfig {
	text: string;
	to: string;
}

export function createAlerter(config: IConfig, log: Bunyan) {
	async function runAlerterAsync() {
		const iAmHome = await determineWhetherIAmHomeAsync();

		// TODO: poll every 10s for 120s
		setTimeout(async () => {
			await alertConditionallyAsync(iAmHome);
		}, 30000);
	}

	function sendAlert(email: IEmail) {
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
			triggerAlert(alertTypes.departure);
		} else if (!iWasHome && iAmHome) {
			triggerAlert(alertTypes.arrival);
		} else {
			const knownPortableDevices = (config.knownPortableDevices || []).filter(kd =>
				detectedMacs.has(kd.mac)
			);

			if (iWasHome && iAmHome) {
				triggerAlert(alertTypes.doorOpen);
			} else if (!iWasHome && !iAmHome) {
				log.info({ knownPortableDevices });

				if (knownPortableDevices.length === 0) {
					triggerAlert(alertTypes.intruder);
				} else {
					triggerAlert(alertTypes.knownDevice, knownPortableDevices);
				}
			}
		}
	}

	function triggerAlert(type: AlertType, detectedKnownPortableDevices?: IDevice[]) {
		const grammar = detectedKnownPortableDevices?.length > 1 ? 'are' : 'is';

		const email = {
			...config.emailConfig,
			to: config.emailRecipients[type].join(';'),
			text: type === alertTypes.knownDevice ? `${detectedKnownPortableDevices.map(d => d.name).join(', ')} ${grammar} home.` : defaultAlertMessages[type],
		};

		sendAlert(email);
	}

	async function determineWhetherIAmHomeAsync(): Promise<boolean> {
		const detectedDevices = await arpscanDevicesAsync();
		log.info({ detectedDevices });

		const detectedMacs = new Set(detectedDevices.map(d => d.mac));

		return detectedMacs.has(config.myPortableDevice.mac);
	}

	return { runAlerterAsync };
}
