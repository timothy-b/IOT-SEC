import arp, { type IArpTable, type IArpTableRow } from '@network-utils/arp-lookup';
import * as Bunyan from 'bunyan';
import type { MessageHeaders } from 'emailjs';
import { GotifyClient } from 'gotify-client';
import _, { type Dictionary } from 'lodash';
import { execSync } from 'node:child_process';
import ping from 'ping';
import { AlertType, IConfig, type IDevice, type User } from '../types/IConfig';
import { delayAsync } from './delay';
import { sendEmailAsync } from './email';
import { StateSmoothingFunctionMachine } from './stateSmoothingFunctionMachine';

const defaultAlertMessages: { [alertType in AlertType]: string } = {
	intruder: 'The fortress is in peril.',
	departure: 'Goodbye.',
	arrival: 'Welcome home.',
	doorOpen: 'The door is open.',
};

const alertTypes = Object.keys(defaultAlertMessages).reduce(
	(map, key) => ({ ...map, [key]: key }),
	{},
) as { [alertType in AlertType]: AlertType };

export function createAlerter(config: IConfig, log: Bunyan) {
	const userByMac = Object.freeze(
		config.users.reduce<Record<string, User>>((prev, cur) => {
			for (const device of cur.devices) {
				prev[device.mac] = cur;
			}
			return prev;
		}, {}),
	);

	function userFromMacs(macs: Set<string>) {
		return new Set(Array.from(macs).map((m) => userByMac[m].name));
	}

	async function runAlerter(): Promise<void> {
		const { homeMacs, awayMacs, arrivedMacs, departedMacs } =
			await pollForDevicePresenceTransitions();

		await sendSummaryMessages(homeMacs, awayMacs, arrivedMacs, departedMacs);
	}

	async function quickScan(): Promise<string> {
		// TODO: don't hardcode this
		execSync('nmap -sn 10.0.0.1/24');

		// TODO: extend @network-utils/arp-lookup to get device names, and use those for mapping to devices in addition to mac address.
		const arpTable = await arp.getTable();

		const homeDevices = await scanForKnownDevices(arpTable);

		if (homeDevices.length === 0) {
			return 'nobody home';
		}

		const homeDeviceMacs = new Set(homeDevices.map((d) => d.mac));

		const userByDevice = config.users.filter((u) =>
			u.devices.some((d) => homeDeviceMacs.has(d.mac)),
		);

		return `home: ${userByDevice.map((u) => u.name).join(', ')}`;
	}

	type DeviceState = 'absent' | 'present';

	const DeviceStates: { [deviceState in DeviceState]: DeviceState } = {
		absent: 'absent',
		present: 'present',
	};

	function getUsersByMac(users: User[], mac: string): User[] {
		return users.filter((u) => u.devices.some((d) => d.mac === mac));
	}

	// TODO: instead of kicking off a new polling session on every request,
	// we probably want to prolong an existing polling singleton
	// that way, transition results are coalesced across triggering events,
	// and we don't spam the receiver with erroneous transitions.
	async function pollForDevicePresenceTransitions(): Promise<{
		homeMacs: Set<string>;
		awayMacs: Set<string>;
		arrivedMacs: Set<string>;
		departedMacs: Set<string>;
	}> {
		const arrivedMacs = new Set<string>();
		const departedMacs = new Set<string>();
		const smoother = new StateSmoothingFunctionMachine<DeviceState>({
			trackedItems: config.users
				.flatMap((u) => u.devices)
				.map((device) => ({
					key: device.mac,
					onFirstTransition: async (newStateName) => {
						let alertType: AlertType;
						switch (newStateName) {
							case DeviceStates.absent:
								alertType = alertTypes.departure;
								departedMacs.add(device.mac);
								break;
							case DeviceStates.present:
								alertType = alertTypes.arrival;
								arrivedMacs.add(device.mac);
								break;
							default:
								throw Error(`Unhandled state" ${newStateName}`);
						}

						await sendSimpleAlert(getUsersByMac(config.users, device.mac), alertType);
					},
				})),
			transitionWindowSize: 3,
			initialStateBiasStatus: DeviceStates.present,
		});

		// use nmap to prime the arp table. Arpscan won't work since it only gets populated via unicast.
		// TODO: don't hardcode this
		execSync('nmap -sn 10.0.0.1/24');

		// TODO: extend @network-utils/arp-lookup to get device names, and use those for mapping to devices in addition to mac address.
		const arpTable = await arp.getTable();

		// TODO: add "armed" mode and don't poll, just alert when opened.
		let remainingPollCount = 15;
		const pollingIntervalInSeconds = 5;
		while (remainingPollCount-- > 0) {
			const detectedDevices = await scanForKnownDevices(arpTable);
			const detectedMacs = new Set(detectedDevices.map((d) => d.mac));

			for (const mac of config.users.flatMap((u) => u.devices).map((d) => d.mac)) {
				smoother.addStatusStep(
					mac,
					detectedMacs.has(mac) ? DeviceStates.present : DeviceStates.absent,
				);
			}

			await delayAsync(pollingIntervalInSeconds * 1000);
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

	async function sendSummaryMessages(
		homeMacs: Set<string>,
		awayMacs: Set<string>,
		arrivedMacs: Set<string>,
		departedMacs: Set<string>,
	): Promise<void> {
		const homeUsers = config.users.filter((u) => u.devices.some((d) => homeMacs.has(d.mac)));

		if (arrivedMacs.size === 0 && departedMacs.size === 0) {
			if (homeMacs.size === 0) {
				await sendSimpleAlert(config.users, alertTypes.intruder);
			} else {
				await sendSimpleAlert(homeUsers, alertTypes.doorOpen);
			}
		} else {
			if (homeMacs.size > 0) {
				await sendAlertWithMessage(
					homeUsers,
					buildHomeSummaryMessage(arrivedMacs, departedMacs),
				);
			}
		}

		if (
			awayMacs.size > 0 &&
			(homeMacs.size > 0 || arrivedMacs.size > 0 || departedMacs.size > 0)
		) {
			const awayUsers = config.users.filter((u) =>
				u.devices.some((d) => awayMacs.has(d.mac)),
			);
			await sendAlertWithMessage(
				awayUsers,
				buildAwaySummaryMessage(homeMacs, arrivedMacs, departedMacs),
			);
		}
	}

	function buildHomeSummaryMessage(arrivedMacs: Set<string>, departedMacs: Set<string>): string {
		const lines = [];

		if (arrivedMacs.size > 0) {
			lines.push(buildLineForMacs('arrived: ', userFromMacs(arrivedMacs)));
		}

		if (departedMacs.size > 0) {
			lines.push(buildLineForMacs('departed: ', userFromMacs(departedMacs)));
		}

		return lines.join('\n');
	}

	function buildAwaySummaryMessage(
		homeMacs: Set<string>,
		arrivedMacs: Set<string> = new Set(),
		departedMacs: Set<string> = new Set(),
	): string {
		const lines = [];

		if (homeMacs.size > 0) {
			lines.push(buildLineForMacs('home: ', userFromMacs(homeMacs)));
		}

		if (arrivedMacs.size > 0) {
			lines.push(buildLineForMacs('arrived: ', userFromMacs(arrivedMacs)));
		}

		if (departedMacs.size > 0) {
			lines.push(buildLineForMacs('departed: ', userFromMacs(departedMacs)));
		}

		return lines.join('\n');
	}

	function buildLineForMacs(linePrefix: string, macs: Set<string>) {
		const userNamesForMacs = config.users
			.filter((u) => u.devices.some((d) => macs.has(d.mac)))
			.map((u) => u.name);

		return `${linePrefix}${userNamesForMacs.join(', ')}`;
	}

	async function scanForKnownDevices(arpTable: IArpTable): Promise<IDevice[]> {
		const knownDevices = config.users.flatMap((u) => u.devices);

		const arpRowByMac: Dictionary<IArpTableRow | undefined> = _.keyBy(arpTable, (a) =>
			a.mac.toLowerCase(),
		);

		const knownDevicesWithIp = knownDevices
			.filter((d) => arpRowByMac[d.mac.toLowerCase()] !== undefined)
			.map((d) => ({
				...d,
				ipAddress: arpRowByMac[d.mac.toLowerCase()]?.ip ?? '',
			}));

		return await pingForDevices(knownDevicesWithIp);
	}

	async function pingForDevices(
		devices: (IDevice & { ipAddress: string })[],
	): Promise<IDevice[]> {
		const ipProbeResults = await Promise.all(
			devices.map((d) => ping.promise.probe(d.ipAddress)),
		);

		const isAliveByIpAddress = ipProbeResults.reduce<Record<string, boolean>>((prev, cur) => {
			if (!cur.numeric_host) {
				return prev;
			}

			prev[cur.numeric_host] = cur.alive;
			return prev;
		}, {});

		return devices.filter((d) => isAliveByIpAddress[d.ipAddress]);
	}

	async function sendSimpleAlert(users: User[], type: AlertType): Promise<void> {
		await sendAlertWithMessage(users, defaultAlertMessages[type]);
	}

	async function sendAlertWithMessage(users: User[], message: string): Promise<void> {
		const alertMethods = _.compact(users.flatMap((u) => u.alertMethods));

		const emailAlertMethods = _.compact(alertMethods.filter((am) => am.type === 'email'));
		if (emailAlertMethods.length > 0) {
			const recipients = emailAlertMethods.map((a) => a.emailAddress).join(',');

			if (recipients !== '') {
				await sendEmailAlert({
					...config.emailConfig,
					to: recipients,
					text: message,
				});
			}
		}

		const gotifyAlertMethods = alertMethods.filter((am) => am.type === 'gotify');
		if (gotifyAlertMethods.length > 0) {
			for (const alertMethod of gotifyAlertMethods) {
				const client = new GotifyClient(alertMethod.url, {
					app: alertMethod.apiKey,
				});

				try {
					log.info('sending gotify message');
					await client.message.createMessage({
						title: 'IOT-SEC',
						message,
					});
				} catch (e) {
					log.error(e);
				}
			}
		}
	}

	async function sendEmailAlert(email: MessageHeaders): Promise<void> {
		try {
			log.info({ emailMessage: email }, 'sending email');
			const message = await sendEmailAsync(email, config);
			log.info({ emailResponse: message }, 'email results');
		} catch (e) {
			log.error(e);
		}
	}

	return { runAlerter, quickScan };
}
