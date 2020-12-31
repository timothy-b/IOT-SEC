import * as Bunyan from 'bunyan';
import { sendEmailAsync } from './email';
import { delayAsync } from './delay';
import { IConfig, IEmailConfig, AlertType } from '../types/IConfig';
import { IDevice } from '../types/IDevice';
import { arpscanDevicesAsync } from './scanner';

const defaultAlertMessages: { [alertType in AlertType]: string } = {
	intruder: 'The fortress is in peril.',
	departure: 'Goodbye.',
	arrival: 'Welcome home.',
	doorOpen: 'The door is open.',
};

const alertTypes = Object.keys(defaultAlertMessages).reduce(
	(map, key) => ({ ...map, [key]: key }),
	{}
) as { [alertType in AlertType]: AlertType };

interface IEmail extends IEmailConfig {
	text: string;
	to: string;
}

export function createAlerter(config: IConfig, log: Bunyan) {
	const portableDeviceByMac = config.knownPortableDevices.reduce((acc, cur) => {
		acc[cur.mac] = cur;
		return acc;
	}, {}) as { string: IDevice };

	async function runAlerterAsync() {
		const initialKnownDevices = await scanForKnownDevicesAsync();
		const initialMacs = new Set<string>(initialKnownDevices.map(d => d.mac));

		const { arrivedMacs, departedMacs } = await pollForDevicePresenceTransitionsAsync(
			initialMacs
		);

		await sendSummaryMessagesAsync(initialMacs, arrivedMacs, departedMacs);
	}

	async function quickScanAsync(): Promise<string> {
		const knownDevices = await scanForKnownDevicesAsync();

		if (knownDevices.length === 0) {
			return 'nobody home';
		}

		return `home: ${knownDevices.map(d => d.name).join(', ')}`;
	}

	async function pollForDevicePresenceTransitionsAsync(
		initialMacs: Set<string>
	): Promise<{ arrivedMacs: Set<string>; departedMacs: Set<string> }> {
		const arrivedMacs = new Set<string>();
		const departedMacs = new Set<string>();
		const pollingLengthInSeconds = 120;
		const pollingIntervalInSeconds = 5;
		let remainingPolls = pollingLengthInSeconds / pollingIntervalInSeconds;
		do {
			await delayAsync(pollingIntervalInSeconds * 1000);

			const detectedDevices = await scanForKnownDevicesAsync();
			const detectedMacs = new Set(detectedDevices.map(d => d.mac));

			for (const mac of detectedMacs) {
				if (!initialMacs.has(mac) && !arrivedMacs.has(mac)) {
					arrivedMacs.add(mac);
					await sendSimpleAlertAsync(alertTypes.arrival, [
						getKnownDeviceByMac(mac).emailAddress,
					]);
				}
			}

			for (const mac of initialMacs) {
				if (!detectedMacs.has(mac) && !departedMacs.has(mac)) {
					departedMacs.add(mac);
					await sendSimpleAlertAsync(alertTypes.departure, [
						getKnownDeviceByMac(mac).emailAddress,
					]);
				}
			}
		} while (--remainingPolls > 0);

		return { arrivedMacs, departedMacs };
	}

	async function sendSummaryMessagesAsync(
		initialMacs: Set<string>,
		arrivedMacs: Set<string>,
		departedMacs: Set<string>
	) {
		const nonTravellingMacs = config.knownPortableDevices
			.map(d => d.mac)
			.filter(mac => !arrivedMacs.has(mac) && !departedMacs.has(mac));
		const awayMacs = new Set<string>(nonTravellingMacs.filter(mac => !initialMacs.has(mac)));
		const homeMacs = new Set<string>(nonTravellingMacs.filter(mac => initialMacs.has(mac)));

		if (arrivedMacs.size === 0 && departedMacs.size === 0) {
			if (initialMacs.size === 0) {
				await sendSimpleAlertAsync(
					alertTypes.intruder,
					config.knownPortableDevices.map(d => d.emailAddress)
				);
			} else {
				await sendSimpleAlertAsync(
					alertTypes.doorOpen,
					config.knownPortableDevices
						.filter(d => homeMacs.has(d.mac))
						.map(d => d.emailAddress)
				);
			}
		} else {
			if (homeMacs.size > 0) {
				await sendAlertWithMessageAsync(
					getEmailAddressLineForMacs(homeMacs),
					buildHomeSummaryMessage(arrivedMacs, departedMacs)
				);
			}
		}

		if (awayMacs.size > 0) {
			await sendAlertWithMessageAsync(
				getEmailAddressLineForMacs(awayMacs),
				buildAwaySummaryMessage(homeMacs, arrivedMacs, departedMacs)
			);
		}
	}

	function getEmailAddressLineForMacs(macs: Set<string>): string {
		return getKnownDevicesByMac(macs)
			.map(d => d.emailAddress)
			.filter(a => a !== null)
			.join(',');
	}

	function getKnownDeviceByMac(mac: string): IDevice {
		return portableDeviceByMac[mac] as IDevice;
	}

	function getKnownDevicesByMac(macs: Set<string>): IDevice[] {
		return Array.from(macs.values()).map(m => portableDeviceByMac[m] as IDevice);
	}

	function buildHomeSummaryMessage(arrivedMacs: Set<string>, departedMacs: Set<string>): string {
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
		arrivedMacs: Set<string> = new Set(),
		departedMacs: Set<string> = new Set()
	): string {
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
		return `${linePrefix}${getKnownDevicesByMac(macs)
			.map(d => d.name)
			.join(', ')}`;
	}

	async function scanForKnownDevicesAsync(): Promise<IDevice[]> {
		const detectedDevices = await arpscanDevicesAsync();
		const detectedMacs = new Set(detectedDevices.map(d => d.mac));

		return (config.knownPortableDevices || []).filter(kd => detectedMacs.has(kd.mac));
	}

	async function sendSimpleAlertAsync(type: AlertType, recipientEmailAddresses: string[]) {
		const recipients = recipientEmailAddresses.filter(a => a !== null).join(',');

		if (recipients !== '') {
			await sendAlertCoreAsync({
				...config.emailConfig,
				to: recipients,
				text: defaultAlertMessages[type],
			});
		}
	}

	async function sendAlertWithMessageAsync(recipients: string, message: string) {
		if (recipients !== '') {
			await sendAlertCoreAsync({
				...config.emailConfig,
				to: recipients,
				text: message,
			});
		}
	}

	async function sendAlertCoreAsync(email: IEmail) {
		try {
			log.info({ emailMessage: email }, 'sending email');
			const message = await sendEmailAsync(email, config);
			log.info({ emailResponse: message }, 'email results');
		} catch (e) {
			log.error(e);
		}
	}

	return { runAlerterAsync, quickScanAsync };
}
