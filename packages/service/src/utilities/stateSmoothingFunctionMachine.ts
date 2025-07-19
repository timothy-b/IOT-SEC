const nameof = <T>(name: keyof T) => name;

interface IStatusSmoothingFunctionMachineConfig<TStatus extends string> {
	trackedItems: {
		key: string;
		onTransition: (newStatus: TStatus) => void;
	}[];
	transitionWindowSize: number;

	/**
	 * If initial state is `null`, and this status is added, set initialStatus to it and reset window.
	 * Similar concept to pull-down resistor; set this to a value which cannot have false a positive.
	 */
	initialStateBiasStatus?: TStatus;
}

interface IItemStatus<TStatus extends string> {
	key: string;
	status: TStatus | null;
}

class StateSmoothingFunctionMachine<TStatus extends string> {
	private state: {
		[key: string]: {
			statusSteps: TStatus[];
			transitionCallback: (newStatus: TStatus) => void;
			currentStatus: TStatus | null;
			hasTransitioned: boolean;
		};
	};
	private config: IStatusSmoothingFunctionMachineConfig<TStatus>;

	constructor(config: IStatusSmoothingFunctionMachineConfig<TStatus>) {
		this.state = {};

		for (const item of config.trackedItems) {
			this.state[item.key] = {
				statusSteps: [],
				transitionCallback: item.onTransition,
				currentStatus: null,
				hasTransitioned: false,
			};
		}

		if (!config.transitionWindowSize) {
			throw Error(
				`${nameof<IStatusSmoothingFunctionMachineConfig<TStatus>>(
					'transitionWindowSize',
				)} is required.`,
			);
		}

		this.config = config;
	}

	public addStatusStep(key: string, status: TStatus) {
		if (!Object.prototype.hasOwnProperty.call(this.state, key)) {
			throw Error(`Invalid key: ${key}. All keys must be added via the constructor.`);
		}

		this.state[key].statusSteps.push(status);

		// If initial status is null and we get the bias status,
		// then set initial status to the bias.
		if (
			this.state[key].currentStatus === null &&
			this.config.initialStateBiasStatus &&
			status === this.config.initialStateBiasStatus
		) {
			this.state[key].currentStatus = this.config.initialStateBiasStatus;
			return;
		}

		if (this.state[key].statusSteps.length < this.config.transitionWindowSize) {
			// If the window isn't full, then we don't have anything else to do yet.
			return;
		}

		// Wait until window is full of a single state before declaring a transition.
		if (
			this.state[key].statusSteps
				.slice(this.config.transitionWindowSize * -1)
				.every((s) => s === status)
		) {
			if (this.state[key].currentStatus === null) {
				// If we don't have an initial status yet, then set it.
				this.state[key].currentStatus = status;
			} else if (
				status !== this.state[key].currentStatus
			) {
				// Otherwise, if the current window's status is different than the initial status,
				// then we've had a transition.
				this.state[key].currentStatus = status;
				this.state[key].hasTransitioned = true;
				this.state[key].transitionCallback(status);
			}
		}
	}

	public getNonTransitionedTrackedItems(): IItemStatus<TStatus>[] {
		const nonTransitioned: IItemStatus<TStatus>[] = [];

		for (const key of Object.keys(this.state)) {
			if (!this.state[key].hasTransitioned) {
				nonTransitioned.push({ key, status: this.state[key].currentStatus });
			}
		}

		return nonTransitioned;
	}
}

export {
	IStatusSmoothingFunctionMachineConfig as IStateSmoothingFunctionMachineConfig,
	StateSmoothingFunctionMachine,
};
