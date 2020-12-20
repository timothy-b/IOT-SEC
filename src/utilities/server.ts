import * as Http from 'http';
import * as Bunyan from 'bunyan';
import { LeakyBucket, LeakyBucketOptions } from 'ts-leaky-bucket';
import uuid from 'uuid-random';
import { IConfig } from '../types/IConfig';
import { isAuthenticated } from './basicAuth';
import { createAlerter } from './alerter';
import { delayAsync } from './delay';

export function createServer(config: IConfig, log: Bunyan) {
	const leakyBucketByIp: {
		[key: string]: { bucket: LeakyBucket; deleter: Promise<void> };
	} = {};
	const leakyBucketOptions: LeakyBucketOptions = {
		capacity: 3,
		intervalMillis: 60_000,
		additionalTimeoutMillis: 60_000,
	};

	function runServer() {
		const server: Http.Server = Http.createServer(async (request, response) => {
			const requestLog = log.child({ traceId: uuid() }, true);

			// The forums mention a 5-second timeout before the webhook push is retried, so do this first.
			// https://community.particle.io/t/electron-and-webhooks-esockettimedout/36413/7
			const shouldProcessRequest = await processResponseAsync(request, response, requestLog);

			if (shouldProcessRequest) {
				await processRequestAsync(request, requestLog);
			}
		})
			.on('error', handleError)
			.once('close', () => {
				server.off('error', handleError);
				log.info('server stopping');
			});

		return server;
	}

	function handleError(error: Error) {
		if (error.message.includes('EACCES')) {
			log.warn('EACCES error - permission denied. You must run the program as admin.');
		}

		log.error(error, 'server error');
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

	async function processResponseAsync(
		request: Http.IncomingMessage,
		response: Http.ServerResponse,
		requestLog: Bunyan
	): Promise<boolean> {
		const wasTarpitted = await maybeTarpitClientAsync(request, requestLog);
		if (wasTarpitted) {
			response.writeHead(429);
			response.end();
			return false;
		}

		let body = '';
		const appendBody = () => {
			body += request.read();
		};
		request.on('readable', appendBody);

		request.once('end', () => {
			requestLog.info(
				{
					request: {
						ip: request.socket.remoteAddress,
						ipVersion: request.socket.remoteFamily,
						method: request.method,
						url: request.url,
						headers: {
							...request.headers,
							authorization: request.headers.authorization ? 'redacted' : null,
						},
						body,
					},
				},
				'request received'
			);

			request.off('readable', appendBody);
		});

		response.writeHead(200, { 'Content-Type': 'text/html' });
		response.write(config.okResponseBody);
		response.end();

		return true;
	}

	async function maybeTarpitClientAsync(
		request: Http.IncomingMessage,
		requestLog: Bunyan
	): Promise<boolean> {
		if (
			request.url === '/' ||
			request.url === '/favicon.ico' ||
			(request.url === '/iotsec/alertDoorOpened' && request.headers.authorization)
		) {
			return false;
		}

		const ipAddress = request.socket.remoteAddress;

		if (!leakyBucketByIp.hasOwnProperty(ipAddress)) {
			leakyBucketByIp[ipAddress] = {
				bucket: new LeakyBucket(leakyBucketOptions),
				deleter: null,
			};
		}

		const bucket = leakyBucketByIp[ipAddress].bucket;

		try {
			await bucket.maybeThrottle(1);
		} catch (e) {
			requestLog.warn(e);
			await delayAsync(600_000);
			return true;
		}

		if (leakyBucketByIp[ipAddress].deleter === null) {
			leakyBucketByIp[ipAddress].deleter = bucket.awaitEmpty().then(() => {
				bucket.stopTimerAndClearQueue();
				delete leakyBucketByIp[ipAddress];
			});
		}

		return false;
	}

	return { runServer };
}
