import * as Bunyan from 'bunyan';
import Config from './config.js';
import { createServer } from './utilities/server';

function main() {
	const log = Bunyan.createLogger(Config.bunyan);
	const server = createServer(Config, log);
	
	server.listen(80);
	if (server.listening) {
		log.info('Server is listening');
	}
}

main();
