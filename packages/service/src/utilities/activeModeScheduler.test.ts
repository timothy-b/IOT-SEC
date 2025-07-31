import { isTimeInEventOccurrence } from './activeModeScheduler';

describe('isTimeInEventOccurrence', () => {
	it('returns true when in occurrence', () => {
		const eventString = `
BEGIN:VEVENT
DTSTART;TZID=America/Los_Angeles:20250727T030000
DTEND;TZID=America/Los_Angeles:20250727T040000
RRULE:FREQ=DAILY;UNTIL=20250801T065959Z
DTSTAMP:20250727T082850Z
UID:asdf@google.com
CREATED:20250727T082717Z
LAST-MODIFIED:20250727T082828Z
SEQUENCE:0
STATUS:CONFIRMED
SUMMARY:test event
TRANSP:OPAQUE
END:VEVENT
`;

		expect(isTimeInEventOccurrence(eventString, '2025-07-28T03:30:00')).toBeTruthy();
	});
});
