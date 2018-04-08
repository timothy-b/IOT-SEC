const arpscan = require('arpscan');

arpscan(function(err, data) {
	if (err)
		console.error(data);
	console.log(JSON.stringify(data))
}, {
	interface: 'eth0',
	sudo: true
});
