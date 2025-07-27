import { execSync } from 'node:child_process';
import _ from 'lodash';

export interface HostScanResult {
	mac: string;
	ipAddress: string;
	hostname: string;
}

export function getUpHosts(): HostScanResult[] {
	const result = execSync('sudo nmap -sn -PE --send-ip 10.0.0.1/24').toString();

	/**
	 * Output looks like:
	 * Starting Nmap 7.80 ( https://nmap.org ) at 2025-07-22 20:53 PDT
	 * Nmap scan report for router.asus.com (10.0.0.1)
	 * Host is up (0.00059s latency).
	 * MAC Address: B0:6E:BF:E4:5E:4C (Asustek Computer)
	 */
	let hostDown = false;
	return _.compact(
		Object.values(
			result
				.split('\n')
				.slice(1, -4)
				.reduce<Record<string, HostScanResult | null>>((prev, cur, index) => {
					const group = Math.floor(index / 3);
					switch (index % 3) {
						case 0: {
							hostDown = false;
							const match =
								/Nmap scan report for ([\w-.]* )?\(?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\)?/.exec(
									cur,
								);
							if (!match) {
								console.error(cur);
								throw new Error('Failed to parse IP Address from nmap scan.');
							}
							prev[group] = {
								hostname: '',
								ipAddress: '',
								mac: '',
							};
							prev[group].hostname = match[1];
							prev[group].ipAddress = match[2];

							break;
						}
						case 1: {
							const match = /Host is up/.exec(cur);
							if (!match) {
								hostDown = true;
								prev[group] = null;
							}
							break;
						}
						case 2: {
							if (hostDown) {
								prev[group] = null;
								break;
							}
							const match =
								/MAC Address: (([A-Z0-9][A-Z0-9]:){5}[A-Z0-9][A-Z0-9])/.exec(cur);
							if (!match) {
								console.error(cur);
								throw new Error('Failed to parse MAC from nmap scan.');
							}
							// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
							prev[group]!.mac = match[1];

							break;
						}
					}

					return prev;
				}, {}),
		),
	);
}
