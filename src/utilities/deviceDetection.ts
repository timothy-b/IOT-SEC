import Arpscan from 'arpscan';
import { promisify } from 'util';

import { IDevice } from "../types/IDevice";


function detectDevices(callback: (err: Error, result: IDevice[]) => void) {
	const arpscanOptions = {
		interface: 'eth0',
		sudo: true,
	};
	Arpscan(callback, arpscanOptions);
}

export const detectDevicesAsync = promisify<IDevice[]>(detectDevices);
