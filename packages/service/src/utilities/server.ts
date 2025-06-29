import * as Bunyan from 'bunyan';
import express, { Application, Express, NextFunction, Response } from 'express';
import uuid from 'uuid-random';
import { CustomRequest } from '../types/CustomRequest';
import { IConfig } from '../types/IConfig';
import { createAlerter } from './alerter';
import { isAuthenticated } from './basicAuth';
import { delayAsync } from './delay';
import {
	SimpleLeakyBucket,
	SimpleLeakyBucketEventKinds,
	SimpleLeakyBucketOptions,
	SimpleLeakyBucketOverflowError,
} from './leakyBucket.js';

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

	function runServer(): Application {
		const app = express();

		app.use(
			'/',
			addTracing,
			async (req, res, next) =>
				await handleTarpittingAsync(req as CustomRequest, res, next, getPathsFromApp(app)),
			handleAuthentication
		);

		app.post(
			'/iotsec/alertDoorOpened',
			handleAlertResponse,
			async (request: CustomRequest, response) => {
				const { runAlerter } = createAlerter(config, request.log);

				// TODO: we probably want to fire-and-forget this and finish the request.
				await runAlerter();
			}
		);

		app.get('/iotsec/config', (request: CustomRequest, response: Response) => {
			const { bunyan, ...rest } = config;
			response.json(rest);
			response.end();
		});

		app.get('/iotsec/quickScan', quickScanAsync);

		// TODO: also make a request to the particle to make sure that it responds.
		app.get('/iotsec/up', (request: CustomRequest, response: Response) => {
			response.writeHead(200);
			response.end();
		});

		app.use(handleError);

		return app;
	}

	function getPathsFromApp(app: Express): Set<string> {
		return new Set(
			app._router.stack.filter((l) => typeof l.route !== 'undefined').map((l) => l.route.path)
		);
	}

	async function quickScanAsync(request: CustomRequest, response: Response) {
		const { quickScan: quickScanAsync } = createAlerter(config, request.log);

		const message = await quickScanAsync();

		response.write(message);
		response.end();
	}

	function addTracing(request: CustomRequest, response: Response, next: NextFunction) {
		request.log = log.child({ traceId: uuid() }, true);

		request.log.info({ request: getRequestInfo(request, null) });

		next();
	}

	async function handleTarpittingAsync(
		request: CustomRequest,
		response: Response,
		next: NextFunction,
		routes: Set<string>
	): Promise<void> {
		const shouldTarpit = isTarPitCandidate(request, routes);
		if (shouldTarpit) {
			request.log.info('delaying response');

			const timeBeforeTarpit = Date.now();
			const shouldTarpit = await maybeTarpitClientAsync(request);
			if (shouldTarpit) {
				request.log.info(`delayed for ${(Date.now() - timeBeforeTarpit) / 1000} seconds`);

				response.writeHead(429);

				// Tarpit for 10 minutes :)
				for (const _ of Array(60)) {
					// Send bytes to keep the connection open.
					response.write('a');
					await delayAsync(10_000);
				}
				request.log.debug(
					`delayed and tarpitted for ${(Date.now() - timeBeforeTarpit) / 1000} seconds`
				);
				response.end();
			}
			response.writeHead(404);
			response.end();
			return;
		}

		next();
	}

	// The forums mention a 5-second timeout before the webhook push is retried, so do this first.
	// https://community.particle.io/t/electron-and-webhooks-esockettimedout/36413/7
	function handleAlertResponse(request: CustomRequest, response: Response, next: NextFunction) {
		let body = '';
		const appendBody = () => {
			body += request.read();
		};
		request.on('readable', appendBody);

		request.once('end', () => {
			request.log.info(
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
		next();
	}

	function handleAuthentication(request: CustomRequest, response: Response, next: NextFunction) {
		request.log.debug('authenticating...');

		if (
			config.basicAuthentication.enabled &&
			!isAuthenticated(config, request.headers.authorization)
		) {
			request.log.error("not auth'd");
			response.writeHead(401);
			response.end("not auth'd");
			return;
		}

		next();
	}

	function getRequestInfo(request: CustomRequest, body: string) {
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

	function isTarPitCandidate(request: CustomRequest, routes: Set<string>): boolean {
		return !routes.add('/').add('/favicon.ico').add('/iotsec/up').has(request.url);
	}

	async function maybeTarpitClientAsync(request: CustomRequest): Promise<boolean> {
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
				request.log.warn(e);
				await delayAsync(600_000);
				return true;
			}

			throw e;
		}
	}

	function handleError(
		error: any,
		request: CustomRequest,
		response: Response,
		next: NextFunction
	) {
		if (error.message.includes('EACCES')) {
			request.log.error(
				error,
				'EACCES error - permission denied. You must run the program as admin.'
			);
		} else {
			request.log.error(error, 'server error');
		}

		response.status(500);
		response.json({ error: error.message });

		next(error);
	}

	return { runServer };
}
