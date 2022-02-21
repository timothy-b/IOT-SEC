// TODO: test `getNonTransitionedTrackedItems`.

import { StateSmoothingFunctionMachine } from '../src/utilities/stateSmoothingFunctionMachine';

test("First transition callback isn't just called when window is full.", async () => {
	// arrange
	const testDeviceMac = 'AA:AA:AA:AA:AA:AA';
	let hasTransitioned = false;
	const transitionWindowSize = 3;
	const machine = new StateSmoothingFunctionMachine({
		trackedItems: [
			{
				key: testDeviceMac,
				onFirstTransition: stateName => {
					hasTransitioned = true;
					console.log(`${testDeviceMac} transitioned to ${stateName}`);
				},
			},
		],
		transitionWindowSize,
	});

	const stateName = 'state1';
	expect(hasTransitioned).toBeFalsy();

	for (const index of [...Array(transitionWindowSize).keys()]) {
		// act
		machine.addStateStep(testDeviceMac, stateName);
		console.log(index);

		// assert
		expect(hasTransitioned).toBe(false);
	}
});

test("First transition callback isn't called if an initial window state isn't achieved.", async () => {
	// arrange
	const testDeviceMac = 'AA:AA:AA:AA:AA:AA';
	let hasTransitioned = false;
	let transitionState: string;
	const transitionWindowSize = 3;
	const machine = new StateSmoothingFunctionMachine({
		trackedItems: [
			{
				key: testDeviceMac,
				onFirstTransition: stateName => {
					hasTransitioned = true;
					transitionState = stateName;
					console.log(`${testDeviceMac} transitioned to ${stateName}`);
				},
			},
		],
		transitionWindowSize,
	});

	expect(hasTransitioned).toBeFalsy();

	// act
	const state1Name = 'state1';
	for (const index of [...Array(transitionWindowSize - 1).keys()]) {
		machine.addStateStep(testDeviceMac, state1Name);
		console.log(index);

		expect(hasTransitioned).toBe(false);
	}

	const state2Name = 'state2';
	for (const index of [...Array(transitionWindowSize).keys()]) {
		machine.addStateStep(testDeviceMac, state2Name);
		console.log(index);

		expect(hasTransitioned).toBe(false);
	}
	expect(transitionState).toBe(undefined);
});

test('First transition callback is called after full transition.', async () => {
	// arrange
	const testDeviceMac = 'AA:AA:AA:AA:AA:AA';
	let hasTransitioned = false;
	let transitionState: string;
	const transitionWindowSize = 3;
	const machine = new StateSmoothingFunctionMachine({
		trackedItems: [
			{
				key: testDeviceMac,
				onFirstTransition: stateName => {
					hasTransitioned = true;
					transitionState = stateName;
					console.log(`${testDeviceMac} transitioned to ${stateName}`);
				},
			},
		],
		transitionWindowSize,
	});

	expect(hasTransitioned).toBeFalsy();

	// act
	const state1Name = 'state1';
	for (const index of [...Array(transitionWindowSize).keys()]) {
		machine.addStateStep(testDeviceMac, state1Name);
		console.log(index);

		expect(hasTransitioned).toBe(false);
	}

	const state2Name = 'state2';
	for (const index of [...Array(transitionWindowSize * 2).keys()]) {
		machine.addStateStep(testDeviceMac, state2Name);
		console.log(index);

		expect(hasTransitioned).toBe(index >= transitionWindowSize - 1);
	}
	expect(transitionState).toBe(state2Name);
});
