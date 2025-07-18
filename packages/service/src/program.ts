import { createLogger } from 'bunyan';
import Config from './config';
import db from './utilities/db';
import { createServer } from './utilities/server';

function main() {
	const { bunyan, ...rest } = Config;
	const log = createLogger(bunyan);
	db.data = db.data || rest;
	void db.write();

	// TODO: verify uniqueness of user names

	const { runServer } = createServer(Config, log);
	const server = runServer();

	const { port } = Config.localhost;
	server.listen(port, () => {
		log.info(`Server is listening on port ${port}`);
	});
}

main();
