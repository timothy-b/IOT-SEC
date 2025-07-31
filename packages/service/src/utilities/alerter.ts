import * as Bunyan from 'bunyan';
import type { MessageHeaders } from 'emailjs';
import { GotifyClient } from 'gotify-client';
import _ from 'lodash';
import { AlertType, IConfig, type User } from '../types/IConfig';
import { delayAsync } from './delay';
import { sendEmailAsync } from './email';
import { StateSmoothingFunctionMachine } from './stateSmoothingFunctionMachine';
import { getUpHosts } from './scanner2';
import { isInActiveModeSchedule } from './activeModeScheduler';

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
	let isPolling = false;
	let shouldExtendPolling = false;
	let isInArmedModeOverride: boolean | null = null;
	// poll for 5 minutes
	// TODO: make this duration configurable
	// TODO: add continuous polling mode instead of triggered polling mode?
	const pollCount = 48;
	const pollingIntervalInSeconds = 5;

	async function runAlerter(): Promise<void> {
		if (isInArmedModeOverride === true || isInActiveModeSchedule()) {
			await runInArmedMode();
		} else {
			await runInReactiveMode();
		}
	}

	async function runInReactiveMode(): Promise<void> {
		log.debug('running in reactive mode');
		if (isPolling) {
			log.debug('extending polling');
			shouldExtendPolling = true;
			return;
		}

		isPolling = true;

		await pollForDevicePresenceTransitions();

		isPolling = false;
	}

	// TODO: add timeout?
	function setIsArmedMode(isArmedMode: boolean | null): void {
		isInArmedModeOverride = isArmedMode;
	}

	async function runInArmedMode(): Promise<void> {
		log.debug('running in armed mode');
		// send alert to all users
		await sendSimpleAlert(config.users, alertTypes.intruder);

		// scan to see who's home and send that to everyone too
		const upHosts = getUpHosts();
		const homeMacs = upHosts.map((h) => h.mac);
		const homeMessage = buildLineForMacs('home: ', new Set(homeMacs));
		await sendAlertWithMessage(config.users, homeMessage);

		// poll to see if somebody comes or goes
		await runInReactiveMode();
	}

	function quickScan(): string {
		const upHosts = getUpHosts();
		const upHostMacs = new Set(upHosts.map((h) => h.mac));
		const homeDevices = config.users
			.flatMap((u) => u.devices)
			.filter((d) => upHostMacs.has(d.mac));

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
		log.debug('polling');
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
			initialStateBiasStatus: DeviceStates.absent,
		});

		let remainingPollCount = pollCount;
		let currentPollCount = 0;
		let hasDetectedDevice = false;
		while (remainingPollCount-- > 0) {
			if (shouldExtendPolling) {
				remainingPollCount = pollCount;
				shouldExtendPolling = false;
			}

			const upHosts = getUpHosts();
			const upHostMacs = new Set(upHosts.map((h) => h.mac));
			const detectedDevices = config.users
				.flatMap((u) => u.devices)
				.filter((d) => upHostMacs.has(d.mac));

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
			lines.push(buildLineForMacs('arrived: ', arrivedMacs));
		}

		if (departedMacs.size > 0) {
			lines.push(buildLineForMacs('departed: ', departedMacs));
		}

		return lines.join('\n');
	}

	function buildLineForMacs(linePrefix: string, macs: Set<string>) {
		const userNamesForMacs = config.users
			.filter((u) => u.devices.some((d) => macs.has(d.mac)))
			.map((u) => u.name);

		return `${linePrefix}${userNamesForMacs.join(', ')}`;
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

	return { runAlerter, quickScan, setIsArmedMode };
}
