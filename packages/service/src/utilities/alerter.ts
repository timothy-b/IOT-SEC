import * as Bunyan from 'bunyan';
import { AlertType, IConfig } from '../types/IConfig';
import { IDevice } from '../types/IDevice';
import IEmail from '../types/IEmail';
import { delayAsync } from './delay';
import { sendEmailAsync } from './email';
import { arpscanDevicesAsync } from './scanner';
import { StateSmoothingFunctionMachine } from './stateSmoothingFunctionMachine';

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

export function createAlerter(config: IConfig, log: Bunyan) {
	const portableDeviceByMac = config.knownPortableDevices.reduce((acc, cur) => {
		acc[cur.mac] = cur;
		return acc;
	}, {}) as { string: IDevice };

	async function runAlerterAsync() {
		const {
			homeMacs,
			awayMacs,
			arrivedMacs,
			departedMacs,
		} = await pollForDevicePresenceTransitionsAsync();

		await sendSummaryMessagesAsync(homeMacs, awayMacs, arrivedMacs, departedMacs);
	}

	async function quickScanAsync(): Promise<string> {
		const knownDevices = await scanForKnownDevicesAsync();

		if (knownDevices.length === 0) {
			return 'nobody home';
		}

		return `home: ${knownDevices.map(d => d.name).join(', ')}`;
	}

	type DeviceState = 'absent' | 'present';

	const DeviceStates: { [deviceState in DeviceState]: DeviceState } = {
		absent: 'absent',
		present: 'present',
	};

	// TODO: instead of kicking off a new polling session on every request,
	// we probably want to prolong an existing polling singleton
	// that way, transition results are coalesced across triggering events,
	// and we don't spam the receiver with erroneous transitions.
	async function pollForDevicePresenceTransitionsAsync(): Promise<{
		homeMacs: Set<string>;
		awayMacs: Set<string>;
		arrivedMacs: Set<string>;
		departedMacs: Set<string>;
	}> {
		const arrivedMacs = new Set<string>();
		const departedMacs = new Set<string>();
		const smoother = new StateSmoothingFunctionMachine<DeviceState>({
			trackedItems: config.knownPortableDevices.map(d => ({
				key: d.mac,
				onFirstTransition: async newStateName => {
					let alertType: AlertType;
					switch (newStateName) {
						case DeviceStates.absent:
							alertType = alertTypes.departure;
							departedMacs.add(d.mac);
							break;
						case DeviceStates.present:
							alertType = alertTypes.arrival;
							arrivedMacs.add(d.mac);
							break;
						default:
							throw Error(`Unhandled state" ${newStateName}`);
					}

					await sendSimpleAlertAsync(alertType, [
						getKnownDeviceByMac(d.mac).emailAddress,
					]);
				},
			})),
			transitionWindowSize: 3,
		});

		let remainingPollCount = 15;
		const pollingIntervalInSeconds = 5;
		while (remainingPollCount-- > 0) {
			await delayAsync(pollingIntervalInSeconds * 1000);

			const detectedDevices = await scanForKnownDevicesAsync();
			const detectedMacs = new Set(detectedDevices.map(d => d.mac));

			for (const mac of config.knownPortableDevices.map(d => d.mac)) {
				smoother.addStatusStep(
					mac,
					detectedMacs.has(mac) ? DeviceStates.present : DeviceStates.absent
				);
			}
		}

		const nonTransitionedDevices = smoother.getNonTransitionedTrackedItems();
		const homeMacs = new Set<string>();
		const awayMacs = new Set<string>();
		for (const device of nonTransitionedDevices) {
			if (device.status === DeviceStates.absent) {
				awayMacs.add(device.key);
			} else {
				// If they went back-and-forth, then they're practically home.
				homeMacs.add(device.key);

				if (arrivedMacs.has(device.key)) {
					arrivedMacs.delete(device.key);
				}

				if (departedMacs.has(device.key)) {
					departedMacs.delete(device.key);
				}
			}
		}

		return { homeMacs, awayMacs, arrivedMacs, departedMacs };
	}

	async function sendSummaryMessagesAsync(
		homeMacs: Set<string>,
		awayMacs: Set<string>,
		arrivedMacs: Set<string>,
		departedMacs: Set<string>
	) {
		if (arrivedMacs.size === 0 && departedMacs.size === 0) {
			if (homeMacs.size === 0) {
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

		if (
			awayMacs.size > 0 &&
			(homeMacs.size > 0 || arrivedMacs.size > 0 || departedMacs.size > 0)
		) {
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
