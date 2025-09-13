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
	const vevent = ICAL.parse(icalVevent);
	const event = new ICAL.Event(new ICAL.Component(vevent));
	const dtstart = event.startDate;
	const target = ICAL.Time.fromString(timeString, null);
	const duration = event.duration;

	let iterator = event.iterator(dtstart);
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
