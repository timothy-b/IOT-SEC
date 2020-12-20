import * as Http from 'http';
import * as Bunyan from 'bunyan';
import uuid from 'uuid-random';
import { IConfig } from '../types/IConfig';
import { isAuthenticated } from './basicAuth';
import { createAlerter } from './alerter';

export function createServer(config: IConfig, log: Bunyan) {
	function runServer() {
		return Http.createServer(async (request, response) => {
			const requestLog = log.child({ traceId: uuid() }, true);

			// The forums mention a 5-second timeout before the webhook push is retried, so do this first.
			// https://community.particle.io/t/electron-and-webhooks-esockettimedout/36413/7
			sendResponse(request, response, requestLog);

			await processRequestAsync(request, requestLog);

			// eslint-disable-next-line mozilla/balanced-listeners
		}).on('error', error => {
			if (error.message.includes('EACCES')) {
				log.warn('EACCES error - permission denied. You must run the program as admin.');
			}

			log.error(error, 'server error');
		});
	}

	async function processRequestAsync(
		request: Http.IncomingMessage,
		requestLog: Bunyan
	): Promise<void> {
		requestLog.info('processing request...');
		if (request.method !== 'POST') {
			return;
		}

		requestLog.debug('authenticating...');
		if (
			config.basicAuthentication.enabled &&
			!isAuthenticated(config, request.headers.authorization, requestLog)
		) {
			requestLog.error("not auth'd");
			return;
		}

		const { runAlerterAsync } = createAlerter(config, requestLog);

		await runAlerterAsync();
	}

	function sendResponse(
		request: Http.IncomingMessage,
		response: Http.ServerResponse,
		requestLog: Bunyan
	) {
		let body = '';
		request.once('readable', () => {
			body += request.read();
		});

		request.once('end', () => {
			requestLog.info(
				{
					request: {
						method: request.method,
						url: request.url,
						headers: { ...request.headers, authorization: 'redacted' },
						body,
					},
				},
				'request received'
			);
		});

		response.writeHead(200, { 'Content-Type': 'text/html' });
		response.write(config.okResponseBody);
		response.end();
	}

	return { runServer };
}
