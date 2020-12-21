import * as Bunyan from 'Bunyan';
import { Request as ExpressRequest } from 'express';

export interface CustomRequest extends ExpressRequest {
    log: Bunyan;
}
