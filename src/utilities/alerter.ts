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
}

const alertTypes = Object.keys(defaultAlertMessages).reduce((map, key) => ({ ...map, [key]: key }), {}) as { [alertType in AlertType]: AlertType };

interface IEmail extends IEmailConfig {
	text: string;
	to: string;
}

function wait(ms: number) : Promise<number> {
    return new Promise((resolve: TimerHandler) => setTimeout(resolve, ms))
}

export function createAlerter(config: IConfig, log: Bunyan) {
	const portableDeviceByMac = config.knownPortableDevices.reduce((acc, cur) => {
		acc[cur.mac] = cur;
		return acc;
	}, {}) as { string: IDevice };

	async function runAlerterAsync() {
		const initialKnownDevices = await scanForKnownDevicesAsync();
		const initialMacs = new Set<string>(initialKnownDevices.map(d => d.mac));

		const { arrivedMacs, departedMacs } = await pollForDevicePresenceTransitionsAsync(initialMacs);

		await sendSummaryMessagesAsync(initialMacs, arrivedMacs, departedMacs);
	}

	async function pollForDevicePresenceTransitionsAsync(initialMacs: Set<string>)
		: Promise<{ arrivedMacs: Set<string>, departedMacs: Set<string> }>
	{
		const arrivedMacs = new Set<string>();
		const departedMacs = new Set<string>();
		const pollingLengthInSeconds = 120;
		const pollingIntervalInSeconds = 5;
		let remainingPolls = pollingLengthInSeconds / pollingIntervalInSeconds;
		do {
			await wait(pollingIntervalInSeconds * 1000);

			const detectedDevices = await scanForKnownDevicesAsync();
			const detectedMacs = new Set(detectedDevices.map(d => d.mac));

			for (const mac of detectedMacs) {
				if (!initialMacs.has(mac) && !arrivedMacs.has(mac)) {
					sendSimpleAlert(alertTypes.arrival, [ getKnownDeviceByMac(mac).emailAddress ]);
					arrivedMacs.add(mac);
				}
			}

			for (const mac of initialMacs) {
				if (!detectedMacs.has(mac) && !departedMacs.has(mac)) {
					sendSimpleAlert(alertTypes.departure, [ getKnownDeviceByMac(mac).emailAddress ]);
					departedMacs.add(mac);
				}
			}
		} while (--remainingPolls > 0);

		return { arrivedMacs, departedMacs };
	}

	async function sendSummaryMessagesAsync(
		initialMacs: Set<string>,
		arrivedMacs: Set<string>,
		departedMacs: Set<string>)
	{
		const nonTravellingMacs = config.knownPortableDevices.map(d => d.mac)
			.filter(mac => !arrivedMacs.has(mac) && !departedMacs.has(mac));
		const awayMacs = new Set<string>(nonTravellingMacs.filter(mac => !initialMacs.has(mac)));
		const homeMacs = new Set<string>(nonTravellingMacs.filter(mac => initialMacs.has(mac)));

		if (arrivedMacs.size === 0 && departedMacs.size === 0) {
			if (initialMacs.size === 0)
				sendSimpleAlert(alertTypes.intruder, config.knownPortableDevices.map(d => d.emailAddress))
			else
				sendSimpleAlert(alertTypes.doorOpen, config.knownPortableDevices.filter(d => homeMacs.has(d.mac)).map(d => d.emailAddress))
		} else {
			if (awayMacs.size > 0) {
				sendAlertWithMessage(
					getKnownDevicesByMac(awayMacs)
						.filter(d => d.emailAddress)
						.join(';'),
					buildAwaySummaryMessage(homeMacs, arrivedMacs, departedMacs));
			}

			if (homeMacs.size > 0) {
				sendAlertWithMessage(
					getKnownDevicesByMac(homeMacs)
						.filter(d => d.emailAddress)
						.join(';'),
					buildHomeSummaryMessage(arrivedMacs, departedMacs));
			}
		}
	}

	function getKnownDeviceByMac(mac: string): IDevice
	{
		return portableDeviceByMac[mac] as IDevice;
	}

	function getKnownDevicesByMac(macs: Set<string>): IDevice[]
	{
		return Array.from(macs.values()).map(m => portableDeviceByMac[m] as IDevice);
	}

	function buildHomeSummaryMessage(
		arrivedMacs: Set<string>,
		departedMacs: Set<string>): string
	{
		const lines = [];
		
		if (arrivedMacs.size > 0) {
			lines.push(getLineForMacs('arrived: ', arrivedMacs));
		}

		if (departedMacs.size > 0) {
			lines.push(getLineForMacs('departed: ', departedMacs));
		}

		return lines.join('\n');
	}

	function buildAwaySummaryMessage(
		homeMacs: Set<string>,
		arrivedMacs: Set<string>,
		departedMacs: Set<string>): string
	{
		const lines = [];
		
		if (homeMacs.size > 0) {
			lines.push(getLineForMacs('home: ', homeMacs));
		}

		if (arrivedMacs.size > 0) {
			lines.push(getLineForMacs('arrived: ', arrivedMacs));
		}

		if (departedMacs.size > 0) {
			lines.push(getLineForMacs('departed: ', departedMacs));
		}

		return lines.join('\n');
	}

	function getLineForMacs(linePrefix: string, macs: Set<string>) {
		return `${linePrefix}${getKnownDevicesByMac(macs).filter(d => d.name)}`;
	}

	async function scanForKnownDevicesAsync(): Promise<IDevice[]> {
		const detectedDevices = await arpscanDevicesAsync();
		const detectedMacs = new Set(detectedDevices.map(d => d.mac));

		return (config.knownPortableDevices || []).filter(kd =>
			detectedMacs.has(kd.mac)
		);
	}

	function sendSimpleAlert(type: AlertType, recipientEmailAddresses: string[]) {
		sendAlertCore({
			...config.emailConfig,
			to: recipientEmailAddresses.join(';'),
			text: defaultAlertMessages[type],
		});
	}

	function sendAlertWithMessage(recipients: string, message: string) {
		sendAlertCore({
			...config.emailConfig,
			to: recipients,
			text: message,
		});
	}

	function sendAlertCore(email: IEmail) {
		log.debug('sending email');

		sendEmail(email, config, (err, result) => {
			if (err) {
				log.error(err);
			} else {
				log.info({ email: result });
			}
		});
	}

	return { runAlerterAsync };
}
