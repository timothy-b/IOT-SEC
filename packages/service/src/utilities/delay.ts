export function delayAsync(ms: number): Promise<number> {
	// eslint-disable-next-line @typescript-eslint/no-implied-eval
	return new Promise((resolve: TimerHandler) => setTimeout(resolve, ms));
}
