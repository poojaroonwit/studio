/**
 * Tests for date utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    createDateInTimezone,
    convertUtcToTimezone,
    formatDateInTimezone,
    getTimezoneOffset,
    getApplicationTimezone
} from '../dateUtils';

describe('dateUtils', () => {
    describe('createDateInTimezone', () => {
        it('should return a Date object', () => {
            const result = createDateInTimezone();
            expect(result).toBeInstanceOf(Date);
        });

        it('should return current time', () => {
            const before = Date.now();
            const result = createDateInTimezone();
            const after = Date.now();

            expect(result.getTime()).toBeGreaterThanOrEqual(before);
            expect(result.getTime()).toBeLessThanOrEqual(after);
        });
    });

    describe('convertUtcToTimezone', () => {
        it('should handle Date object input', () => {
            const inputDate = new Date('2024-01-15T12:00:00Z');
            const result = convertUtcToTimezone(inputDate);

            expect(result).toBeInstanceOf(Date);
            expect(result.getTime()).toBe(inputDate.getTime());
        });

        it('should handle ISO string input', () => {
            const inputString = '2024-01-15T12:00:00Z';
            const result = convertUtcToTimezone(inputString);

            expect(result).toBeInstanceOf(Date);
        });
    });

    describe('formatDateInTimezone', () => {
        it('should format date with default format', () => {
            const date = new Date('2024-01-15T12:30:00Z');
            const result = formatDateInTimezone(date);

            // Should contain month, day, year, and time
            expect(result).toMatch(/\w+\s\d+,\s\d{4}\s\d{2}:\d{2}/);
        });

        it('should format date with custom format', () => {
            const date = new Date('2024-01-15T00:00:00Z');
            const result = formatDateInTimezone(date, 'yyyy-MM-dd');

            expect(result).toBe('2024-01-15');
        });

        it('should handle string date input', () => {
            const dateString = '2024-01-15T12:00:00Z';
            const result = formatDateInTimezone(dateString, 'yyyy-MM-dd');

            expect(result).toBe('2024-01-15');
        });
    });

    describe('getTimezoneOffset', () => {
        it('should return a number', () => {
            const result = getTimezoneOffset();
            expect(typeof result).toBe('number');
        });

        it('should return offset in hours', () => {
            const result = getTimezoneOffset();
            // Offset should be within reasonable range (-12 to +14 hours)
            expect(result).toBeGreaterThanOrEqual(-12);
            expect(result).toBeLessThanOrEqual(14);
        });
    });

    describe('getApplicationTimezone', () => {
        it('should return Asia/Bangkok as default', () => {
            const result = getApplicationTimezone();
            expect(result).toBe('Asia/Bangkok');
        });
    });
});
