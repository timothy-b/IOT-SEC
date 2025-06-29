// This isn't a simple solution, this is a fun solution :)
// Adapted from https://rclayton.silvrback.com/custom-errors-in-node-js

import { EventEmitter } from 'events';

export interface SimpleLeakyBucketOptions {
	burstCapacity: number;
	maxCapacity: number;
	/**
	 * @property These accumulate as volume is added to the bucket,
	 * but aren't used for waiting calculations until the burstCapacity has been exceeded.
	 */
	millisecondsPerDecrement: number;
}

export enum SimpleLeakyBucketEventKinds {
	disposed = 'disposed',
	empty = 'empty',
}

export class SimpleLeakyBucketOverflowError extends Error {
	constructor(message: string | undefined) {
		super(message);

		// Ensure the name of this error is the same as the class name
		this.name = this.constructor.name;
		// This clips the constructor invocation from the stack trace.
		// It's not absolutely essential, but it does make the stack trace a little nicer.
		//  @see Node.js reference (bottom)
		Error.captureStackTrace(this, this.constructor);
	}
}

export class SimpleLeakyBucket extends EventEmitter {
	private burstCapacity: number;
	private maxCapacity: number;
	private currentVolume: number;
	private millisecondsPerDecrement: number;
	private lastUpdateTimeMilliseconds: number | null;
	private queue: { resolve: () => void; reject: () => void }[];
	private timer: NodeJS.Timeout | null;
	private isDisposing: boolean;

	constructor(options: SimpleLeakyBucketOptions) {
		super();

		this.burstCapacity = options.burstCapacity || 0;
		this.maxCapacity = options.maxCapacity || 0;
		this.millisecondsPerDecrement = options.millisecondsPerDecrement || 0;
		this.currentVolume = 0;
		this.queue = [];
		this.timer = null;
		this.isDisposing = false;
		this.lastUpdateTimeMilliseconds = null;
	}

	/**
	 * @returns whether the item was over the burst threshold.
	 */
	async incrementAsync(): Promise<boolean> {
		if (this.isDisposing) {
			return false;
		}

		this.updateVolume();

		if (this.currentVolume + 1 > this.maxCapacity) {
			throw new SimpleLeakyBucketOverflowError('overflow');
		}

		this.currentVolume++;

		const isOverBurstCapacity = this.currentVolume > this.burstCapacity;

		return new Promise<boolean>((resolve, reject) => {
			this.queue.push({
				resolve: () => {
					resolve(isOverBurstCapacity);
				},
				reject,
			});

			if (this.timer === null) {
				// No `await` - don't wait for the queue to finish processing.
				void this.startProcessingQueueAsync();
			}
		});
	}

	/**
	 * Use this to stop and dispose of the bucket.
	 */
	dispose() {
		this.isDisposing = true;
		if (this.timer !== null) {
			clearTimeout(this.timer);
		}
		this.queue = [];
		this.emit(SimpleLeakyBucketEventKinds.disposed);
	}

	private async startProcessingQueueAsync() {
		if (this.timer !== null) {
			return;
		}

		let shouldKeepProcessing = true;
		while (shouldKeepProcessing) {
			shouldKeepProcessing = await this.processQueueAsync();
		}

		this.emit(SimpleLeakyBucketEventKinds.empty);
	}

	/**
	 * @summary Returns a Promise which resolves immediately if the bucket is below the burst threshold,
	 * or a Promise which resolves after leaking below the burst threshold.
	 */
	private async processQueueAsync(): Promise<boolean> {
		if (this.queue.length === 0 && this.currentVolume === 0) {
			this.timer = null;

			return new Promise((resolve) => {
				resolve(false);
			});
		}

		this.updateVolume();

		const isBelowBurstCapacity = this.currentVolume < this.burstCapacity;
		if (this.queue.length > 0 && isBelowBurstCapacity) {
			this.queue.pop()?.resolve();

			return new Promise((resolve) => {
				resolve(true);
			});
		} else {
			const timeToWait = isBelowBurstCapacity
				? 0
				: this.currentVolume * this.millisecondsPerDecrement;

			return new Promise((resolve) => {
				this.timer = setTimeout(() => {
					resolve(true);
				}, timeToWait);
			});
		}
	}

	private updateVolume() {
		const now = Date.now();

		if (this.lastUpdateTimeMilliseconds === null) {
			this.lastUpdateTimeMilliseconds = now;
		}

		const decrementAmount =
			(now - this.lastUpdateTimeMilliseconds) / this.millisecondsPerDecrement;

		this.currentVolume -= decrementAmount;

		if (this.currentVolume < 0) {
			this.currentVolume = 0;
			this.lastUpdateTimeMilliseconds = null;
		} else {
			this.lastUpdateTimeMilliseconds = now;
		}
	}
}
