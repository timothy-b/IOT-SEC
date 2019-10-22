import Arpscan from 'arpscan';
import { promisify } from 'util';

interface IArpscannedDevice {
	ip: string;
	mac: string;
	vendor: string;
	timestamp: number;
}


function detectDevices(callback: (err: Error, result: IArpscannedDevice[]) => void) {
	const arpscanOptions = {
		interface: 'eth0',
		sudo: true,
	};
	Arpscan(callback, arpscanOptions);
}

export const detectDevicesAsync = promisify<IArpscannedDevice[]>(detectDevices);
