import { createLogger } from 'bunyan';
import Config from './config';
import { createServer } from './utilities/server';
import db from './utilities/db';

function main() {
	const { bunyan, ...rest } = Config;
	const log = createLogger(bunyan);
	db.data = db.data || rest;
	db.write();
	const { runServer } = createServer(Config, log);
	const server = runServer();

	const { port } = Config.localhost;
	server.listen(port, () => log.info(`Server is listening on port ${port}`));
}

main();
