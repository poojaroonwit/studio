/**
 * Tests for SLA utility functions (pure functions only - no DB dependencies)
 */

import { describe, it, expect } from 'vitest';
import {
    getSLABadgeVariant,
    formatSLAMessage,
    getEffectiveSLAStartDateForHeadcount,
    type SLACheckResult
} from '../slaUtils';

describe('slaUtils', () => {
    describe('getSLABadgeVariant', () => {
        it('should return default for zero days overdue', () => {
            expect(getSLABadgeVariant(0)).toBe('default');
        });

        it('should return destructive for positive days overdue', () => {
            expect(getSLABadgeVariant(1)).toBe('destructive');
            expect(getSLABadgeVariant(5)).toBe('destructive');
            expect(getSLABadgeVariant(100)).toBe('destructive');
        });

        it('should return default for negative days (not overdue)', () => {
            expect(getSLABadgeVariant(-1)).toBe('default');
            expect(getSLABadgeVariant(-10)).toBe('default');
        });
    });

    describe('formatSLAMessage', () => {
        it('should format message for non-violated SLA', () => {
            const slaResult: SLACheckResult = {
                isViolated: false,
                daysOverdue: 0,
                slaDays: 30,
                gradeName: 'Senior',
                gradeColor: '#3B82F6'
            };

            const result = formatSLAMessage(slaResult);
            expect(result).toBe('Senior - 30 days SLA');
        });

        it('should format message for violated SLA', () => {
            const slaResult: SLACheckResult = {
                isViolated: true,
                daysOverdue: 5,
                slaDays: 30,
                gradeName: 'Senior',
                gradeColor: '#3B82F6'
            };

            const result = formatSLAMessage(slaResult);
            expect(result).toBe('Senior - 5 days overdue (30 days SLA)');
        });

        it('should format message with different grade names', () => {
            const slaResult: SLACheckResult = {
                isViolated: false,
                daysOverdue: 0,
                slaDays: 14,
                gradeName: 'Junior',
                gradeColor: '#22C55E'
            };

            const result = formatSLAMessage(slaResult);
            expect(result).toBe('Junior - 14 days SLA');
        });
    });

    describe('getEffectiveSLAStartDateForHeadcount', () => {
        it('should return onboarding date for filled headcount with onboarding date', () => {
            const headcount = {
                status: 'filled',
                onboardingDate: '2024-01-15T00:00:00Z',
                requestDate: '2024-01-01T00:00:00Z'
            };

            const result = getEffectiveSLAStartDateForHeadcount(headcount);
            expect(result).toEqual(new Date('2024-01-15T00:00:00Z'));
        });

        it('should return request date for vacant headcount', () => {
            const headcount = {
                status: 'vacant',
                requestDate: '2024-01-01T00:00:00Z'
            };

            const result = getEffectiveSLAStartDateForHeadcount(headcount);
            expect(result).toEqual(new Date('2024-01-01T00:00:00Z'));
        });

        it('should return request date for filled headcount without onboarding date', () => {
            const headcount = {
                status: 'filled',
                requestDate: '2024-01-01T00:00:00Z'
            };

            const result = getEffectiveSLAStartDateForHeadcount(headcount);
            expect(result).toEqual(new Date('2024-01-01T00:00:00Z'));
        });

        it('should return null when no dates available', () => {
            const headcount = {
                status: 'vacant'
            };

            const result = getEffectiveSLAStartDateForHeadcount(headcount);
            expect(result).toBeNull();
        });

        it('should return null for empty object', () => {
            const result = getEffectiveSLAStartDateForHeadcount({});
            expect(result).toBeNull();
        });
    });
});
