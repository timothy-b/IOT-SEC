export function delayAsync(ms: number): Promise<number> {
	return new Promise((resolve: TimerHandler) => setTimeout(resolve, ms));
}
