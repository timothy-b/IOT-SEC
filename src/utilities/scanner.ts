import Arpscan from 'arpscan';
import { promisify } from 'util';

interface IArpscannedDevice {
	ip: string;
	mac: string;
	vendor: string;
	timestamp: number;
}

function arpscanDevices(callback: (err: Error, result: IArpscannedDevice[]) => void) {
	const arpscanOptions = {
		interface: 'eth0',
		sudo: true,
	};
	Arpscan(callback, arpscanOptions);
}

export const arpscanDevicesAsync = promisify<IArpscannedDevice[]>(arpscanDevices);
