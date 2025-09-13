import ICAL from 'ical.js';
import Config from '../config';

export function isInActiveModeSchedule(): boolean {
	const armedModeVEvent = Config.armedModeVEvent;
	if (!armedModeVEvent) {
		return false;
	}

	return isTimeInEventOccurrence(armedModeVEvent, ICAL.Time.now().toString());
}

export function isTimeInEventOccurrence(icalVevent: string, timeString: string): boolean {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const vevent = ICAL.parse(icalVevent);
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
	const event = new ICAL.Event(new ICAL.Component(vevent));
	const dtstart = event.startDate;
	const target = ICAL.Time.fromString(timeString, null);
	const duration = event.duration;

	const iterator = event.iterator(dtstart);
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	for (let next = iterator.next(); next && next.compare(target) < 0; next = iterator.next()) {
		const endOfOccurrence = ICAL.Time.fromJSDate(next.toJSDate());
		endOfOccurrence.addDuration(duration);
		if (endOfOccurrence.compare(target) < 0) {
			continue;
		}

		return true;
	}

	return false;
}
