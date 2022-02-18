const nameof = <T>(name: keyof T) => name;

interface IStateSmoothingFunctionMachineConfig<TState extends string> {
	trackedItems: {
		key: string;
		onFirstTransition: (newState: TState) => void;
	}[];
	transitionWindowSize: number;
}

interface IItemState<TState extends string> {
	key: string;
	state: TState | null;
}

class StateSmoothingFunctionMachine<TState extends string> {
	private state: {
		[key: string]: {
			stateSteps: TState[];
			firstTransitionCallback: (newState: TState) => void;
			initialState: TState | null;
			hasTransitioned: boolean;
		};
	};
	private config: IStateSmoothingFunctionMachineConfig<TState>;

	constructor(config: IStateSmoothingFunctionMachineConfig<TState>) {
		this.state = {};

		for (const item of config.trackedItems) {
			this.state[item.key] = {
				stateSteps: [],
				firstTransitionCallback: item.onFirstTransition,
				initialState: null,
				hasTransitioned: false,
			};
		}

		if (!config.transitionWindowSize) {
			throw Error(
				`${nameof<IStateSmoothingFunctionMachineConfig<TState>>(
					'transitionWindowSize'
				)} is required.`
			);
		}

		this.config = config;
	}

	public addStateStep(key: string, state: TState) {
		if (!Object.prototype.hasOwnProperty.call(this.state, key)) {
			throw Error(`Invalid key: ${key}. All keys must be added via the constructor.`);
		}

		this.state[key].stateSteps.push(state);

		if (this.state[key].stateSteps.length < this.config.transitionWindowSize) {
			return;
		}

		const lastStageStep = this.state[key].stateSteps.slice(-1)[0];
		if (
			this.state[key].stateSteps
				.slice(this.config.transitionWindowSize * -1)
				.every(s => s === lastStageStep)
		) {
			if (this.state[key].initialState === null) {
				this.state[key].initialState = lastStageStep;
			} else if (
				!this.state[key].hasTransitioned &&
				lastStageStep !== this.state[key].initialState
			) {
				this.state[key].hasTransitioned = true;
				this.state[key].firstTransitionCallback(lastStageStep);
			}
		}
	}

	public getNonTransitionedTrackedItems(): IItemState<TState>[] {
		const nonTransitioned: IItemState<TState>[] = [];

		for (const key of Object.keys(this.state)) {
			if (!this.state[key].hasTransitioned) {
				nonTransitioned.push({ key, state: this.state[key].initialState });
			}
		}

		return nonTransitioned;
	}
}

export { StateSmoothingFunctionMachine, IStateSmoothingFunctionMachineConfig };
