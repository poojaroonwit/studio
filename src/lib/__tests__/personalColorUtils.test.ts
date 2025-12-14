/**
 * Tests for personal color utility functions
 */

import { describe, it, expect } from 'vitest';
import {
    getCandidatePersonalColor,
    getRecruiterPersonalColor,
    getCandidateCardStyles,
    getRecruiterAvatarStyles,
    getCardBorderStyles
} from '../personalColorUtils';

describe('personalColorUtils', () => {
    describe('getCandidatePersonalColor', () => {
        const mockRecruiters = [
            { id: 'rec-1', name: 'John', email: 'john@test.com', personalColor: '#FF5733' },
            { id: 'rec-2', name: 'Jane', email: 'jane@test.com', personalColor: '#33FF57' }
        ];

        it('should return recruiter personal color for candidate', () => {
            const candidate = { id: 'cand-1', name: 'Test', recruiterId: 'rec-1' } as any;
            const result = getCandidatePersonalColor(candidate, mockRecruiters as any);
            expect(result).toBe('#FF5733');
        });

        it('should return default blue when no recruiterId', () => {
            const candidate = { id: 'cand-1', name: 'Test' } as any;
            const result = getCandidatePersonalColor(candidate, mockRecruiters as any);
            expect(result).toBe('#3B82F6');
        });

        it('should return default blue when no recruiters provided', () => {
            const candidate = { id: 'cand-1', name: 'Test', recruiterId: 'rec-1' } as any;
            const result = getCandidatePersonalColor(candidate);
            expect(result).toBe('#3B82F6');
        });

        it('should return default blue when recruiter not found', () => {
            const candidate = { id: 'cand-1', name: 'Test', recruiterId: 'rec-unknown' } as any;
            const result = getCandidatePersonalColor(candidate, mockRecruiters as any);
            expect(result).toBe('#3B82F6');
        });
    });

    describe('getRecruiterPersonalColor', () => {
        it('should return recruiter personal color', () => {
            const recruiter = { id: '1', name: 'John', personalColor: '#FF5733' } as any;
            expect(getRecruiterPersonalColor(recruiter)).toBe('#FF5733');
        });

        it('should return default blue when no recruiter', () => {
            expect(getRecruiterPersonalColor()).toBe('#3B82F6');
            expect(getRecruiterPersonalColor(undefined)).toBe('#3B82F6');
        });

        it('should return default blue when no personal color', () => {
            const recruiter = { id: '1', name: 'John' } as any;
            expect(getRecruiterPersonalColor(recruiter)).toBe('#3B82F6');
        });
    });

    describe('getCandidateCardStyles', () => {
        it('should return empty object when not selected', () => {
            const result = getCandidateCardStyles('#FF5733', false);
            expect(result).toEqual({});
        });

        it('should return empty object by default (not selected)', () => {
            const result = getCandidateCardStyles('#FF5733');
            expect(result).toEqual({});
        });

        it('should return styles when selected', () => {
            const result = getCandidateCardStyles('#FF5733', true);
            expect(result.borderColor).toBe('#FF5733');
            expect(result.backgroundColor).toBe('#FF573310');
            expect(result.boxShadow).toContain('#FF5733');
        });
    });

    describe('getRecruiterAvatarStyles', () => {
        it('should return styles with personal color', () => {
            const result = getRecruiterAvatarStyles('#FF5733');
            expect(result.backgroundColor).toBe('#FF5733');
            expect(result.boxShadow).toContain('#FF5733');
        });
    });

    describe('getCardBorderStyles', () => {
        it('should return empty object when not selected', () => {
            const result = getCardBorderStyles('#FF5733', false);
            expect(result).toEqual({});
        });

        it('should return styles when selected', () => {
            const result = getCardBorderStyles('#FF5733', true);
            expect(result.borderColor).toBe('#FF5733');
            expect(result.boxShadow).toContain('#FF5733');
        });
    });
});
