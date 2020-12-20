export interface SimpleLeakyBucketOptions {
	maxCapacity: number;
	millisecondsPerDecrement: number;
}

// TODO: add event emitter for 'empty'.
export default class SimpleLeakyBucket {
	maxCapacity: number;
	currentCapacity: number;
	millisecondsPerDecrement: number;
	lastDripTimeMilliseconds: number;
	queue: { resolve: () => void; reject: () => void }[];
	timer: NodeJS.Timeout;

	constructor(options: SimpleLeakyBucketOptions) {
		this.maxCapacity = options.maxCapacity;
		this.currentCapacity = 0;
		this.millisecondsPerDecrement = options.millisecondsPerDecrement;
		this.lastDripTimeMilliseconds = Date.now() / 1000;
		this.queue = [];
		this.timer = null;
	}

	async incrementAsync(): Promise<void> {
		this.updateDrip();

		if (this.currentCapacity + 1 > this.maxCapacity) {
			throw Error('overflow');
		}

		this.currentCapacity++;

		return new Promise((resolve, reject) => {
			this.queue.push({ resolve, reject });

			if (this.timer === null) {
				this.startTimer();
			}
		});
	}

	/**
	 * @private
	 */
	async updateDrip() {
		const now = Date.now() / 1000;
		const decrementAmount =
			(now - this.lastDripTimeMilliseconds) / this.millisecondsPerDecrement;
		this.currentCapacity -= decrementAmount;
		this.lastDripTimeMilliseconds = now;
	}

	/**
	 * @private
	 */
	startTimer() {
		if (this.queue.length === 0) {
			return;
		}

		if (this.timer === null) {
			const promiseResolver = this.queue.pop();

			this.updateDrip();

			promiseResolver.resolve();

			if (this.queue.length > 0) {
				this.startTimer();
			}
		} else {
			const timeToWait = this.currentCapacity * this.millisecondsPerDecrement;

			this.timer = setTimeout(() => {
				this.timer = null;
				this.startTimer();
			}, timeToWait);
		}
	}
}
