import * as Bunyan from 'bunyan';

import { IConfig } from "../types/IConfig";
import { detectDevicesAsync } from "./deviceDetection";
import { sendEmailAsync } from './email';

export async function alertIfNotHome(config: IConfig, log: Bunyan) {
	const detectedDevices = await detectDevicesAsync();
		log.info({ detectedDevices }, 'scanned network');

		const myPortableDevices = detectedDevices.filter(d =>
			config.whitelistedDevices.map(w => w.mac).includes(d.mac)
		);

		const knownPortableDevices = detectedDevices.filter(d =>
			config.knownPortableDevices.map(kd => kd.mac).includes(d.mac)
		);

		if (myPortableDevices.length === 0) {
			const email = knownPortableDevices.length !== 0
				? {
						...config.emailRecipient,
						text: `${knownPortableDevices.join(', ')} is home.`,
					}
				: config.emailRecipient;

			await sendEmailAsync(email, config, log);
		}
}