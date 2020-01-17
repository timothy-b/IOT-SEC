const util = require('util');
const Arpscan = require('arpscan');

console.log(Arpscan);

Arpscan(
	function (err, data) {
		if (err) console.error(data);
		console.log(JSON.stringify(data));
	},
	{
		interface: 'eth0',
		sudo: true,
	}
);

function detectDevices(callback) {
	const arpscanOptions = {
		interface: 'eth0',
		sudo: true,
	};
	Arpscan(callback, arpscanOptions);
}

const detectDevicesAsync = util.promisify(detectDevices);

(async () => {
	const result = await detectDevicesAsync();
	console.log(result);
})();
