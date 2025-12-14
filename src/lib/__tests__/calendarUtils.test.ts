/**
 * Tests for calendar utility functions
 */

import { describe, it, expect } from 'vitest';
import {
    generateCalendarInvite,
    type CalendarEventDetails
} from '../calendarUtils';

describe('calendarUtils', () => {
    describe('generateCalendarInvite', () => {
        const basicEvent: CalendarEventDetails = {
            title: 'Interview with John Doe',
            startDate: new Date('2024-01-15T10:00:00Z'),
            endDate: new Date('2024-01-15T11:00:00Z')
        };

        it('should generate valid iCal content', () => {
            const result = generateCalendarInvite(basicEvent);

            expect(result).toContain('BEGIN:VCALENDAR');
            expect(result).toContain('END:VCALENDAR');
            expect(result).toContain('BEGIN:VEVENT');
            expect(result).toContain('END:VEVENT');
        });

        it('should include VERSION and PRODID', () => {
            const result = generateCalendarInvite(basicEvent);

            expect(result).toContain('VERSION:2.0');
            expect(result).toContain('PRODID:');
        });

        it('should include event title', () => {
            const result = generateCalendarInvite(basicEvent);

            expect(result).toContain('SUMMARY:Interview with John Doe');
        });

        it('should format dates correctly', () => {
            const result = generateCalendarInvite(basicEvent);

            expect(result).toContain('DTSTART:20240115T100000Z');
            expect(result).toContain('DTEND:20240115T110000Z');
        });

        it('should include description when provided', () => {
            const eventWithDesc: CalendarEventDetails = {
                ...basicEvent,
                description: 'Interview for Senior Developer position'
            };
            const result = generateCalendarInvite(eventWithDesc);

            expect(result).toContain('DESCRIPTION:');
            expect(result).toContain('Interview for Senior Developer position');
        });

        it('should include location when provided', () => {
            const eventWithLocation: CalendarEventDetails = {
                ...basicEvent,
                location: 'Room 101'
            };
            const result = generateCalendarInvite(eventWithLocation);

            expect(result).toContain('LOCATION:Room 101');
        });

        it('should include organizer when provided', () => {
            const eventWithOrganizer: CalendarEventDetails = {
                ...basicEvent,
                organizer: {
                    name: 'HR Manager',
                    email: 'hr@company.com'
                }
            };
            const result = generateCalendarInvite(eventWithOrganizer);

            expect(result).toContain('ORGANIZER');
            expect(result).toContain('hr@company.com');
        });

        it('should include attendees when provided', () => {
            const eventWithAttendees: CalendarEventDetails = {
                ...basicEvent,
                attendees: [
                    { name: 'John Doe', email: 'john@example.com' },
                    { name: 'Jane Smith', email: 'jane@example.com' }
                ]
            };
            const result = generateCalendarInvite(eventWithAttendees);

            expect(result).toContain('ATTENDEE');
            expect(result).toContain('john@example.com');
            expect(result).toContain('jane@example.com');
        });

        it('should include UID for event', () => {
            const result = generateCalendarInvite(basicEvent);

            expect(result).toContain('UID:');
        });

        it('should use custom UID when provided', () => {
            const eventWithUid: CalendarEventDetails = {
                ...basicEvent,
                uid: 'custom-uid-12345'
            };
            const result = generateCalendarInvite(eventWithUid);

            expect(result).toContain('UID:custom-uid-12345');
        });

        it('should include STATUS:CONFIRMED', () => {
            const result = generateCalendarInvite(basicEvent);

            expect(result).toContain('STATUS:CONFIRMED');
        });

        it('should escape special characters in text', () => {
            const eventWithSpecialChars: CalendarEventDetails = {
                title: 'Interview; Discussion, Follow-up',
                startDate: new Date('2024-01-15T10:00:00Z'),
                endDate: new Date('2024-01-15T11:00:00Z')
            };
            const result = generateCalendarInvite(eventWithSpecialChars);

            // Semicolons and commas should be escaped
            expect(result).toContain('\\;');
            expect(result).toContain('\\,');
        });
    });
});
