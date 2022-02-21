import { createLogger } from 'bunyan';
import Config from './config';
import { createServer } from './utilities/server';

function main() {
	const log = createLogger(Config.bunyan);
	const { runServer } = createServer(Config, log);
	const server = runServer();

	const { port } = Config.localhost;
	server.listen(port, () => log.info(`Server is listening on port ${port}`));
}

main();
