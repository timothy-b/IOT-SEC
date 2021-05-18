import {
	SimpleLeakyBucket
} from '../src/utilities/leakyBucket';
import { delayAsync } from '../src/utilities/delay';

console.log('asdf');

test('does not block under burst capacity', async () => {
	// arrange
	const options = {
		burstCapacity: 3,
		maxCapacity: 100,
		millisecondsPerDecrement: 1000,
	};
	const bucket = new SimpleLeakyBucket(options);

	//act
	const startTime = Date.now();
	for (const _ of Array(options.burstCapacity)) {
		await bucket.incrementAsync();
	}
	const stopTime = Date.now();

	bucket.dispose();

	//assert
	expect(stopTime - startTime).toBeLessThan(options.millisecondsPerDecrement / 2);
});

test('blocks for correct amount of time after burst threshold', async () => {
	// arrange
	const options = {
		burstCapacity: 3,
		maxCapacity: 100,
		millisecondsPerDecrement: 1000,
	};
	const bucket = new SimpleLeakyBucket(options);

	// act
	const startTime = Date.now();
	for (const _ of Array(options.burstCapacity)) {
		await bucket.incrementAsync();
	}
	await bucket.incrementAsync();
	const stopTime = Date.now();

	bucket.dispose();

	// assert
	const fudgeDelta = options.millisecondsPerDecrement / 2;
	expect(stopTime - startTime).toBeLessThan(
		(options.burstCapacity + 1 + fudgeDelta) * options.millisecondsPerDecrement
	);
});

test('cools down after burst threshold has been passed and bucket has drained', async () => {
	// arrange
	const options = {
		burstCapacity: 3,
		maxCapacity: 100,
		millisecondsPerDecrement: 1000,
	};
	const bucket = new SimpleLeakyBucket(options);

	for (const _ of Array(options.burstCapacity)) {
		await bucket.incrementAsync();
	}
	await bucket.incrementAsync();

	const fudgeDelta = options.millisecondsPerDecrement / 2;
	await delayAsync(options.burstCapacity + 1 + fudgeDelta);

	// act
	const startTime = Date.now();
	await bucket.incrementAsync();
	const stopTime = Date.now();

	bucket.dispose();

	// assert
	expect(stopTime - startTime).toBeLessThan(options.millisecondsPerDecrement);
});
