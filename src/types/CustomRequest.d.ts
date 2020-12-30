import * as Bunyan from 'bunyan';
import { Request as ExpressRequest } from 'express';

export interface CustomRequest extends ExpressRequest {
	log: Bunyan;
}
