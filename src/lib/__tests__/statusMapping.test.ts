/**
 * Tests for status mapping utility functions
 */

import { describe, it, expect } from 'vitest';
import {
    COMMON_STATUS_NAMES,
    STATUS_COLORS,
    getStatusColor,
    getStatusBadgeVariant,
    isActiveStatus,
    isInterviewStatus
} from '../statusMapping';

describe('statusMapping', () => {
    describe('COMMON_STATUS_NAMES', () => {
        it('should have all expected status names', () => {
            expect(COMMON_STATUS_NAMES.APPLIED).toBe('Applied');
            expect(COMMON_STATUS_NAMES.SCREENING).toBe('Screening');
            expect(COMMON_STATUS_NAMES.SHORTLISTED).toBe('Shortlisted');
            expect(COMMON_STATUS_NAMES.INTERVIEW_SCHEDULED).toBe('Interview Scheduled');
            expect(COMMON_STATUS_NAMES.INTERVIEWING).toBe('Interviewing');
            expect(COMMON_STATUS_NAMES.OFFER_EXTENDED).toBe('Offer Extended');
            expect(COMMON_STATUS_NAMES.OFFER_ACCEPTED).toBe('Offer Accepted');
            expect(COMMON_STATUS_NAMES.HIRED).toBe('Hired');
            expect(COMMON_STATUS_NAMES.ON_HOLD).toBe('On Hold');
            expect(COMMON_STATUS_NAMES.REJECTED).toBe('Rejected');
            expect(COMMON_STATUS_NAMES.WITHDRAWN).toBe('Withdrawn');
        });
    });

    describe('STATUS_COLORS', () => {
        it('should have color for each status', () => {
            Object.values(COMMON_STATUS_NAMES).forEach(status => {
                expect(STATUS_COLORS[status]).toBeDefined();
                expect(typeof STATUS_COLORS[status]).toBe('string');
            });
        });

        it('should contain Tailwind CSS classes', () => {
            Object.values(STATUS_COLORS).forEach(color => {
                expect(color).toContain('bg-');
                expect(color).toContain('text-');
            });
        });
    });

    describe('getStatusColor', () => {
        it('should return color for known status', () => {
            const color = getStatusColor('Applied');
            expect(color).toContain('bg-blue');
        });

        it('should return gray for unknown status', () => {
            const color = getStatusColor('Unknown Status');
            expect(color).toContain('bg-gray');
        });

        it('should return color for Hired status', () => {
            const color = getStatusColor('Hired');
            expect(color).toContain('bg-emerald');
        });

        it('should return color for Rejected status', () => {
            const color = getStatusColor('Rejected');
            expect(color).toContain('bg-red');
        });
    });

    describe('getStatusBadgeVariant', () => {
        it('should return default for Hired', () => {
            expect(getStatusBadgeVariant('Hired')).toBe('default');
        });

        it('should return default for Offer Accepted', () => {
            expect(getStatusBadgeVariant('Offer Accepted')).toBe('default');
        });

        it('should return secondary for interview stages', () => {
            expect(getStatusBadgeVariant('Interview Scheduled')).toBe('secondary');
            expect(getStatusBadgeVariant('Interviewing')).toBe('secondary');
            expect(getStatusBadgeVariant('Offer Extended')).toBe('secondary');
        });

        it('should return destructive for Rejected', () => {
            expect(getStatusBadgeVariant('Rejected')).toBe('destructive');
        });

        it('should return outline for early stages', () => {
            expect(getStatusBadgeVariant('Applied')).toBe('outline');
            expect(getStatusBadgeVariant('Screening')).toBe('outline');
            expect(getStatusBadgeVariant('Shortlisted')).toBe('outline');
        });

        it('should return outline for unknown status', () => {
            expect(getStatusBadgeVariant('Unknown')).toBe('outline');
        });
    });

    describe('isActiveStatus', () => {
        it('should return true for active statuses', () => {
            expect(isActiveStatus('Applied')).toBe(true);
            expect(isActiveStatus('Screening')).toBe(true);
            expect(isActiveStatus('Interviewing')).toBe(true);
            expect(isActiveStatus('Offer Extended')).toBe(true);
        });

        it('should return false for backlog statuses', () => {
            expect(isActiveStatus('Hired')).toBe(false);
            expect(isActiveStatus('Rejected')).toBe(false);
            expect(isActiveStatus('Offer Accepted')).toBe(false);
            expect(isActiveStatus('Withdrawn')).toBe(false);
        });
    });

    describe('isInterviewStatus', () => {
        it('should return true for interview statuses', () => {
            expect(isInterviewStatus('Interview Scheduled')).toBe(true);
            expect(isInterviewStatus('Interviewing')).toBe(true);
        });

        it('should return false for non-interview statuses', () => {
            expect(isInterviewStatus('Applied')).toBe(false);
            expect(isInterviewStatus('Screening')).toBe(false);
            expect(isInterviewStatus('Hired')).toBe(false);
            expect(isInterviewStatus('Rejected')).toBe(false);
        });
    });
});
