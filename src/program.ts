import * as Bunyan from 'bunyan';
import Config from './config.js';
import { createServer } from './utilities/server';
import * as Arpscan from 'arpscan';

function main() {
	const log = Bunyan.createLogger(Config.bunyan);
	const server = createServer(Config, log);
	console.log(Arpscan);
	
	server.listen(80);
	if (server.listening) {
		log.info('Server is listening');
	}
}

main();
