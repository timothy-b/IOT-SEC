import * as Http from 'http';
import * as Bunyan from 'bunyan';

import { IConfig } from '../types/IConfig';
import { isAuthenticated } from './basicAuth';
import { createAlerter } from './alerter';

export function createServer(config: IConfig, log: Bunyan) {
	function runServer() {
		return Http.createServer(async (request, response) => {
			await processRequestAsync(request);

			await sendResponseAsync(request, response);
			// eslint-disable-next-line mozilla/balanced-listeners
		}).on('error', error => {
			if (error.message.includes('EACCES')) {
				log.warn('EACCES error - permission denied. You must run the program as admin.');
			}

			log.error(error, 'server error');
		});
	}

	async function processRequestAsync(request: Http.IncomingMessage): Promise<void> {
		log.info('processing request...');
		if (request.method !== 'POST') {
			return;
		}

		log.info('authenticating...');
		if (
			config.basicAuthentication.enabled &&
			!isAuthenticated(config, request.headers.authorization, log)
		) {
			log.error("not auth'd");
			return;
		}

		const { runAlerterAsync } = createAlerter(config, log);

		await runAlerterAsync();
	}

	async function sendResponseAsync(request: Http.IncomingMessage, response: Http.ServerResponse) {
		let body = '';
		// eslint-disable-next-line mozilla/balanced-listeners
		request.on('readable', () => {
			body += request.read();
		});

		// eslint-disable-next-line mozilla/balanced-listeners
		request.on('end', () => {
			log.info({
				request: {
					method: request.method,
					url: request.url,
					headers: request.headers,
					body,
				},
				msg: 'request received',
			});
		});

		response.writeHead(200, { 'Content-Type': 'text/html' });
		response.write(config.okResponseBody);
		response.end();
	}

	return { runServer };
}
