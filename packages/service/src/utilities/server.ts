import * as Bunyan from 'bunyan';
import express, {
	Application,
	Express,
	Request as ExpressRequest,
	NextFunction,
	Response,
} from 'express';
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
			(req: ExpressRequest, res: express.Response, next: express.NextFunction) => {
				void handleTarpittingAsync(req as CustomRequest, res, next, getPathsFromApp(app));
			},
			handleAuthentication,
		);

		app.post('/iotsec/alertDoorOpened', handleAlertResponse, (request: ExpressRequest) => {
			const { runAlerter } = createAlerter(config, (request as CustomRequest).log);

			void runAlerter();
		});

		app.get('/iotsec/config', (request: ExpressRequest, response: Response) => {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { bunyan, ...rest } = config;
			response.json(rest);
			response.end();
		});

		app.get('/iotsec/quickScan', quickScanAsync);

		// TODO: also make a request to the particle to make sure that it responds.
		app.get('/iotsec/up', (request: ExpressRequest, response: Response) => {
			response.writeHead(200);
			response.end();
		});

		app.use(handleError);

		return app;
	}

	function getPathsFromApp(app: Express): Set<string> {
		return new Set(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
			app._router.stack
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				.filter((l: { route: any }) => typeof l.route !== 'undefined')
				// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
				.map((l: { route: { path: any } }) => l.route.path),
		);
	}

	function quickScanAsync(request: ExpressRequest, response: Response) {
		const { quickScan } = createAlerter(config, (request as CustomRequest).log);

		void quickScan().then((message) => {
			response.write(message);
			response.end();
		});
	}

	function addTracing(request: ExpressRequest, response: Response, next: NextFunction) {
		const mutatedRequest = request as CustomRequest;

		mutatedRequest.log = log.child({ traceId: uuid() }, true);

		mutatedRequest.log.info({ request: getRequestInfo(mutatedRequest, null) });

		next();
	}

	async function handleTarpittingAsync(
		request: CustomRequest,
		response: Response,
		next: NextFunction,
		routes: Set<string>,
	): Promise<void> {
		const shouldTarpit = isTarPitCandidate(request, routes);
		if (shouldTarpit) {
			request.log.info('delaying response');

			const timeBeforeTarpit = Date.now();
			const shouldTarpit = await maybeTarpitClientAsync(request);
			if (shouldTarpit) {
				request.log.info(
					`delayed for ${(Date.now().valueOf() - timeBeforeTarpit.valueOf()) / 1000} seconds`,
				);

				response.writeHead(429);

				// Tarpit for 10 minutes :)
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				for (const _ of Array(60)) {
					// Send bytes to keep the connection open.
					response.write('a');
					await delayAsync(10_000);
				}
				request.log.debug(
					`delayed and tarpitted for ${(Date.now().valueOf() - timeBeforeTarpit.valueOf()) / 1000} seconds`,
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
	function handleAlertResponse(request: ExpressRequest, response: Response, next: NextFunction) {
		const mutatedRequest = request as CustomRequest;
		let body = '';
		const appendBody = () => {
			// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
			body += mutatedRequest.read();
		};
		mutatedRequest.on('readable', appendBody);

		mutatedRequest.once('end', () => {
			mutatedRequest.log.info(
				{
					request: getRequestInfo(mutatedRequest, body),
				},
				'request received',
			);

			mutatedRequest.off('readable', appendBody);
		});

		response.writeHead(200, { 'Content-Type': 'text/html' });
		response.write(config.okResponseBody);
		response.end();
		next();
	}

	function handleAuthentication(request: ExpressRequest, response: Response, next: NextFunction) {
		const mutatedRequest = request as CustomRequest;

		mutatedRequest.log.debug('authenticating...');

		if (
			config.basicAuthentication.enabled &&
			!isAuthenticated(config, request.headers.authorization)
		) {
			mutatedRequest.log.error("not auth'd");
			response.writeHead(401);
			response.end("not auth'd");
			return;
		}

		next();
	}

	function getRequestInfo(request: CustomRequest, body: string | null) {
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
		if (ipAddress === undefined) {
			return false;
		}

		if (!leakyBucketByIp.hasOwnProperty(ipAddress)) {
			const newBucket = new SimpleLeakyBucket(leakyBucketOptions);

			newBucket.once(SimpleLeakyBucketEventKinds.empty, () => {
				newBucket.dispose();
				// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
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
		error: { message: string },
		request: ExpressRequest,
		response: Response,
		next: NextFunction,
	) {
		const mutatedRequest = request as CustomRequest;

		if (error.message.includes('EACCES')) {
			mutatedRequest.log.error(
				error,
				'EACCES error - permission denied. You must run the program as admin.',
			);
		} else {
			mutatedRequest.log.error(error, 'server error');
		}

		response.status(500);
		response.json({ error: error.message });

		next(error);
	}

	return { runServer };
}
