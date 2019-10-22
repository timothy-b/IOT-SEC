import * as Bunyan from 'bunyan';
import * as Arpscan from 'arpscan';

import { IConfig } from "../types/IConfig";
//import { detectDevicesAsync } from "./deviceDetection";
import { sendEmail } from './email';

export function alertIfNotHome(config: IConfig, log: Bunyan) {
	log.info('scanning...');
	//const detectedDevices = await detectDevicesAsync();
	log.info(Arpscan);

	const arpscanOptions = {
		interface: 'eth0',
		sudo: true,
	};
	Arpscan((err, result) => {
		if (err) {
			log.error(err);
			return
		}

		log.info('scanned');
		const detectedDevices = result;
		const detectedMacs = detectedDevices.map(d => d.mac);
		log.info(detectedDevices);

		const myPortableDevices = (config.myPortableDevices || [])
			.filter(wd => detectedMacs.includes(wd.mac));

		const knownPortableDevices = (config.knownPortableDevices || [])
			.filter(kd => detectedMacs.includes(kd.mac));

		log.info(myPortableDevices);
		log.info(knownPortableDevices);
		if (myPortableDevices.length === 0) {
			const email = knownPortableDevices.length !== 0
				? {
						...config.emailRecipient,
						text: `${knownPortableDevices.map(d => d.name).join(', ')} is home.`,
					}
				: {
					...config.emailRecipient,
					text: 'The fortress is in peril.'
				};

			log.info('sending email');

			sendEmail(email, config, (err, result) => {
				log.info(err);
				log.info(result);
			});
		}
	}, arpscanOptions);
}
