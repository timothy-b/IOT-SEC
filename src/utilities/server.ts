import * as Http from 'http';
import * as Bunyan from 'bunyan';
import uuid from 'uuid-random';
import {
	SimpleLeakyBucket,
	SimpleLeakyBucketOptions,
	SimpleLeakyBucketEventKinds,
	SimpleLeakyBucketOverflowError,
} from './leakyBucket';
import { IConfig } from '../types/IConfig';
import { isAuthenticated } from './basicAuth';
import { createAlerter } from './alerter';
import { delayAsync } from './delay';

export function createServer(config: IConfig, log: Bunyan) {
	const leakyBucketByIp: {
		[key: string]: SimpleLeakyBucket;
	} = {};

	// The goal of these settings is to just slow the initial response
	// for requests which should be tarpitted.
	const leakyBucketOptions: SimpleLeakyBucketOptions = {
		burstCapacity: 5,
		maxCapacity: 100,
		millisecondsPerDecrement: 1000,
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

	async function processResponseAsync(
		request: Http.IncomingMessage,
		response: Http.ServerResponse,
		requestLog: Bunyan
	): Promise<boolean> {
		const shouldTarpit = isTarPitCandidate(request);
		if (shouldTarpit) {
			requestLog.info({ request: getRequestInfo(request, null) }, 'delaying response');

			const timeBeforeTarpit = Date.now();
			const shouldTarpit = await maybeTarpitClientAsync(request, requestLog);
			if (shouldTarpit) {
				requestLog.info(`delayed for ${(Date.now() - timeBeforeTarpit) / 1000} seconds`);

				response.writeHead(429);

				// Tarpit for 10 minutes :)
				/* eslint-disable  @typescript-eslint/naming-convention */
				/* eslint-disable @typescript-eslint/no-unused-vars */
				for (const _ of Array(60)) {
					// Send bytes to keep the connection open.
					response.write('a');
					await delayAsync(10_000);
				}
				requestLog.debug(
					`delayed and tarpitted for ${(Date.now() - timeBeforeTarpit) / 1000} seconds`
				);
				response.end();
			}
			response.writeHead(404);
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
					request: getRequestInfo(request, body),
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
			requestLog.warn("not auth'd");
			return;
		}

		const { runAlerterAsync } = createAlerter(config, requestLog);

		await runAlerterAsync();
	}

	function getRequestInfo(request: Http.IncomingMessage, body: string) {
		return {
			ip: request.socket.remoteAddress,
			ipVersion: request.socket.remoteFamily,
			method: request.method,
			url: request.url,
			headers: {
				...request.headers,
				authorization: request.headers.authorization ? 'redacted' : null,
			},
			body,
		};
	}

	function isTarPitCandidate(request: Http.IncomingMessage): boolean {
		return !(
			request.url === '/' ||
			request.url === '/favicon.ico' ||
			(request.url === '/iotsec/alertDoorOpened' && request.headers.authorization !== null)
		);
	}

	async function maybeTarpitClientAsync(
		request: Http.IncomingMessage,
		requestLog: Bunyan
	): Promise<boolean> {
		const ipAddress = request.socket.remoteAddress;

		if (!leakyBucketByIp.hasOwnProperty(ipAddress)) {
			const newBucket = new SimpleLeakyBucket(leakyBucketOptions);

			newBucket.once(SimpleLeakyBucketEventKinds.empty, () => {
				newBucket.dispose();
				delete leakyBucketByIp[ipAddress];
			});

			leakyBucketByIp[ipAddress] = newBucket;
		}

		try {
			return await leakyBucketByIp[ipAddress].incrementAsync();
		} catch (e) {
			if (e instanceof SimpleLeakyBucketOverflowError) {
				requestLog.warn(e);
				await delayAsync(600_000);
				return true;
			}

			throw e;
		}
	}

	function handleError(error: Error) {
		if (error.message.includes('EACCES')) {
			log.warn('EACCES error - permission denied. You must run the program as admin.');
		}

		log.error(error, 'server error');
	}

	return { runServer };
}
