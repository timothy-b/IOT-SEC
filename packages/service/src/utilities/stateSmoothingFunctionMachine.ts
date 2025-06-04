const nameof = <T>(name: keyof T) => name;

interface IStatusSmoothingFunctionMachineConfig<TStatus extends string> {
	trackedItems: {
		key: string;
		onFirstTransition: (newStatus: TStatus) => void;
	}[];
	transitionWindowSize: number;
}

interface IItemStatus<TStatus extends string> {
	key: string;
	status: TStatus | null;
}

class StateSmoothingFunctionMachine<TStatus extends string> {
	private state: {
		[key: string]: {
			statusSteps: TStatus[];
			firstTransitionCallback: (newStatus: TStatus) => void;
			initialStatus: TStatus | null;
			hasTransitioned: boolean;
		};
	};
	private config: IStatusSmoothingFunctionMachineConfig<TStatus>;

	constructor(config: IStatusSmoothingFunctionMachineConfig<TStatus>) {
		this.state = {};

		for (const item of config.trackedItems) {
			this.state[item.key] = {
				statusSteps: [],
				firstTransitionCallback: item.onFirstTransition,
				initialStatus: null,
				hasTransitioned: false,
			};
		}

		if (!config.transitionWindowSize) {
			throw Error(
				`${nameof<IStatusSmoothingFunctionMachineConfig<TStatus>>(
					'transitionWindowSize'
				)} is required.`
			);
		}

		this.config = config;
	}

	public addStatusStep(key: string, status: TStatus) {
		if (!Object.prototype.hasOwnProperty.call(this.state, key)) {
			throw Error(`Invalid key: ${key}. All keys must be added via the constructor.`);
		}

		this.state[key].statusSteps.push(status);

		if (this.state[key].statusSteps.length < this.config.transitionWindowSize) {
			// If the window isn't full, then we don't have anything else to do yet.
			return;
		}

		// Wait until window is full of a single state before declaring a transition.
		if (
			this.state[key].statusSteps
				.slice(this.config.transitionWindowSize * -1)
				.every(s => s === status)
		) {
			if (this.state[key].initialStatus === null) {
				// If we don't have an initial status yet, then set it.
				this.state[key].initialStatus = status;
			} else if (
				!this.state[key].hasTransitioned &&
				status !== this.state[key].initialStatus
			) {
				// Otherwise, if the current window's status is different than the initial status,
				// then we've had a transition.
				this.state[key].hasTransitioned = true;
				this.state[key].firstTransitionCallback(status);
			}
		}
	}

	public getNonTransitionedTrackedItems(): IItemStatus<TStatus>[] {
		const nonTransitioned: IItemStatus<TStatus>[] = [];

		for (const key of Object.keys(this.state)) {
			if (!this.state[key].hasTransitioned) {
				nonTransitioned.push({ key, status: this.state[key].initialStatus });
			}
		}

		return nonTransitioned;
	}
}

export { IStatusSmoothingFunctionMachineConfig as IStateSmoothingFunctionMachineConfig, StateSmoothingFunctionMachine };

