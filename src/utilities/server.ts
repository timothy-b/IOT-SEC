import * as Http from 'http';
import * as Bunyan from 'bunyan';

import { IConfig } from '../types/IConfig';
import { isAuthenticated } from './basicAuth';
import { runAlerterAsync } from './alerter';

export const createServer = (config: IConfig, log: Bunyan) => {
	return Http.createServer(async (request, response) => {
		await processRequestAsync(request, config, log);

		await sendResponseAsync(request, response, config, log);
	}).on('error', error => {
		if (error.message.includes('EACCES')) {
			log.warn('EACCES error - permission denied. You must run the program as admin.');
		}

		log.error(error, 'server error');
	});
}

async function processRequestAsync(
	request: Http.IncomingMessage,
	config: IConfig,
	log: Bunyan
): Promise<void> {
	log.info('processing request...');
	if (request.method !== 'POST') {
		return;
	}

	log.info('authenticating...');
	if (config.basicAuthentication.enabled
		&& !isAuthenticated(config, request.headers.authorization, log)) {
			log.info('not auth\'d');
		return
	}

	await runAlerterAsync(config, log);
}

async function sendResponseAsync(
	request: Http.IncomingMessage,
	response: Http.ServerResponse,
	config: IConfig,
	log: Bunyan
) {
	let body = '';
	request.on('readable', () => {
		body += request.read();
	});

	request.on('end', () => {
		log.info(
			{
				method: request.method,
				url: request.url,
				headers: request.headers,
				body,
			},
			'request received'
		);
	});

	response.writeHead(200, { 'Content-Type': 'text/html' });
	response.write(config.okResponseBody);
	response.end();
}
