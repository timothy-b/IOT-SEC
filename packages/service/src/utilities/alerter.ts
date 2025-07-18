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

type DeviceState = 'absent' | 'present';

const DeviceStates: { [deviceState in DeviceState]: DeviceState } = {
	absent: 'absent',
	present: 'present',
};

export function createAlerter(config: IConfig, log: Bunyan) {
	const userByMac = Object.freeze(
		config.users.reduce<Record<string, User>>((prev, cur) => {
			for (const device of cur.devices) {
				prev[device.mac] = cur;
			}
			return prev;
		}, {}),
	);
	let isPolling = false;
	let shouldExtendPolling = false;
	// poll for 5 minutes
	// TODO: make this duration configurable
	// TODO: add continuous polling mode instead of triggered polling mode?
	const pollCount = 48;
	const pollingIntervalInSeconds = 5;

	function userFromMacs(macs: Set<string>): Set<string> {
		return new Set(Array.from(macs).map((m) => userByMac[m].name));
	}

	async function runAlerter(): Promise<void> {
		if (isPolling) {
			shouldExtendPolling = true;
			return;
		}

		isPolling = true;

		await pollForDevicePresenceTransitions();

		isPolling = false;
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

	function getUsersByMac(users: User[], mac: string): User[] {
		return users.filter((u) => u.devices.some((d) => d.mac === mac));
	}

	async function pollForDevicePresenceTransitions(): Promise<void> {
		const arrivedMacs = new Set<string>();
		const departedMacs = new Set<string>();
		const transitionWindowSize = 3;
		const smoother = new StateSmoothingFunctionMachine<DeviceState>({
			trackedItems: config.users
				.flatMap((u) => u.devices)
				.map((device) => ({
					key: device.mac,
					onTransition: async (newStateName) => {
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

						const transitionedUsers = getUsersByMac(config.users, device.mac);
						// message transitioned user
						await sendSimpleAlert(transitionedUsers, alertType);

						// message other users
						const message = buildTransitionedSummaryMessage(
							new Set(alertType === alertTypes.arrival ? [device.mac] : []),
							new Set(alertType === alertTypes.departure ? [device.mac] : []),
						);
						const transitionedUsernames = new Set(transitionedUsers.map((u) => u.name));
						await sendAlertWithMessage(
							config.users.filter((u) => !transitionedUsernames.has(u.name)),
							message,
						);
					},
				})),
			transitionWindowSize,
			initialStateBiasStatus: DeviceStates.present,
		});

		// use nmap to prime the arp table. Arpscan won't work since it only gets populated via unicast.
		// TODO: don't hardcode this
		execSync('nmap -sn 10.0.0.1/24');

		// TODO: extend @network-utils/arp-lookup to get device names, and use those for mapping to devices in addition to mac address.
		const arpTable = await arp.getTable();

		let remainingPollCount = pollCount;
		let currentPollCount = 0;
		let hasDetectedDevice = false;
		while (remainingPollCount-- > 0) {
			if (shouldExtendPolling) {
				remainingPollCount = pollCount;
				shouldExtendPolling = false;
			}

			const detectedDevices = await scanForKnownDevices(arpTable);

			hasDetectedDevice = hasDetectedDevice || detectedDevices.length > 0;

			// if end of first window and nobody is home, then alert
			if (++currentPollCount === transitionWindowSize && !hasDetectedDevice) {
				await sendSimpleAlert(config.users, alertTypes.intruder);
			}

			const detectedMacs = new Set(detectedDevices.map((d) => d.mac));
			for (const mac of config.users.flatMap((u) => u.devices).map((d) => d.mac)) {
				smoother.addStatusStep(
					mac,
					detectedMacs.has(mac) ? DeviceStates.present : DeviceStates.absent,
				);
			}

			await delayAsync(pollingIntervalInSeconds * 1000);
		}
	}

	function buildTransitionedSummaryMessage(
		arrivedMacs: Set<string>,
		departedMacs: Set<string>,
	): string {
		const lines = [];

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
