import { createLogger } from 'bunyan';
import Config from './config';
import { createServer } from './utilities/server';

function main() {
	const log = createLogger(Config.bunyan);
	const { runServer } = createServer(Config, log);
	const server = runServer();

	server.listen(80, () => log.info('Server is listening on port 80'));
}

main();
