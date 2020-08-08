import * as Bunyan from 'bunyan';
import * as Arpscan from 'arpscan';
import Config from './config';
import { createServer } from './utilities/server';

function main() {
	const log = Bunyan.createLogger(Config.bunyan);
	const { runServer } = createServer(Config, log);
	const server = runServer();
	console.log(Arpscan);

	server.listen(80);
	if (server.listening) {
		log.info('Server is listening');
	}
}

main();
