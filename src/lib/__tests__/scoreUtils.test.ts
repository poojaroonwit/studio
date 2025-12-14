/**
 * Tests for score utility functions
 */

import { describe, it, expect } from 'vitest';
import {
    getScoreGrade,
    getScoreGradeInfo,
    getScoreColor,
    getScoreBgColor,
    formatScoreWithGrade,
    getScoreRangesForChart,
    normalizeFitScore,
    SCORE_GRADES
} from '../scoreUtils';

describe('scoreUtils', () => {
    describe('SCORE_GRADES', () => {
        it('should have 5 grade levels', () => {
            expect(SCORE_GRADES).toHaveLength(5);
        });

        it('should have grades A through E', () => {
            const letters = SCORE_GRADES.map(g => g.letter);
            expect(letters).toEqual(['A', 'B', 'C', 'D', 'E']);
        });

        it('should cover full 0-100 range without gaps', () => {
            const sortedGrades = [...SCORE_GRADES].sort((a, b) => a.min - b.min);
            expect(sortedGrades[0].min).toBe(0);
            expect(sortedGrades[sortedGrades.length - 1].max).toBe(100);
        });
    });

    describe('getScoreGrade', () => {
        it('should return A for scores 81-100', () => {
            expect(getScoreGrade(81)).toBe('A');
            expect(getScoreGrade(90)).toBe('A');
            expect(getScoreGrade(100)).toBe('A');
        });

        it('should return B for scores 61-80', () => {
            expect(getScoreGrade(61)).toBe('B');
            expect(getScoreGrade(70)).toBe('B');
            expect(getScoreGrade(80)).toBe('B');
        });

        it('should return C for scores 41-60', () => {
            expect(getScoreGrade(41)).toBe('C');
            expect(getScoreGrade(50)).toBe('C');
            expect(getScoreGrade(60)).toBe('C');
        });

        it('should return D for scores 21-40', () => {
            expect(getScoreGrade(21)).toBe('D');
            expect(getScoreGrade(30)).toBe('D');
            expect(getScoreGrade(40)).toBe('D');
        });

        it('should return E for scores 0-20', () => {
            expect(getScoreGrade(0)).toBe('E');
            expect(getScoreGrade(10)).toBe('E');
            expect(getScoreGrade(20)).toBe('E');
        });

        it('should return null for null/undefined', () => {
            expect(getScoreGrade(null)).toBeNull();
            expect(getScoreGrade(undefined)).toBeNull();
        });

        it('should return null for out of range scores', () => {
            expect(getScoreGrade(-1)).toBeNull();
            expect(getScoreGrade(101)).toBeNull();
        });

        it('should convert decimal scores (0-1) to percentages', () => {
            expect(getScoreGrade(0.85)).toBe('A'); // 85%
            expect(getScoreGrade(0.50)).toBe('C'); // 50%
            expect(getScoreGrade(0.15)).toBe('E'); // 15%
        });
    });

    describe('getScoreGradeInfo', () => {
        it('should return full grade info object', () => {
            const result = getScoreGradeInfo(85);
            expect(result).toMatchObject({
                letter: 'A',
                range: '81-100',
                min: 81,
                max: 100
            });
        });

        it('should return null for invalid scores', () => {
            expect(getScoreGradeInfo(null)).toBeNull();
            expect(getScoreGradeInfo(undefined)).toBeNull();
        });
    });

    describe('getScoreColor', () => {
        it('should return color for valid score', () => {
            const result = getScoreColor(85);
            expect(result).toBe('text-black');
        });

        it('should return empty string for invalid score', () => {
            expect(getScoreColor(null)).toBe('');
            expect(getScoreColor(undefined)).toBe('');
        });
    });

    describe('getScoreBgColor', () => {
        it('should return background color for valid score', () => {
            const result = getScoreBgColor(85);
            expect(result).toContain('bg-');
        });

        it('should return gray for invalid score', () => {
            expect(getScoreBgColor(null)).toBe('bg-gray-200');
        });
    });

    describe('formatScoreWithGrade', () => {
        it('should format score with grade letter', () => {
            expect(formatScoreWithGrade(85)).toBe('85% (A)');
            expect(formatScoreWithGrade(50)).toBe('50% (C)');
        });

        it('should return N/A for null/undefined', () => {
            expect(formatScoreWithGrade(null)).toBe('N/A');
            expect(formatScoreWithGrade(undefined)).toBe('N/A');
        });

        it('should convert decimal to percentage', () => {
            expect(formatScoreWithGrade(0.85)).toBe('85% (A)');
        });

        it('should format zero score as E grade', () => {
            expect(formatScoreWithGrade(0)).toBe('0% (E)');
        });
    });

    describe('getScoreRangesForChart', () => {
        it('should return array of chart ranges', () => {
            const result = getScoreRangesForChart();
            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(5);
        });

        it('should include label, min, max, and letter', () => {
            const result = getScoreRangesForChart();
            result.forEach(range => {
                expect(range).toHaveProperty('label');
                expect(range).toHaveProperty('min');
                expect(range).toHaveProperty('max');
                expect(range).toHaveProperty('letter');
            });
        });
    });

    describe('normalizeFitScore', () => {
        it('should convert decimal (0-1) to percentage', () => {
            expect(normalizeFitScore(0.55)).toBe(55);
            expect(normalizeFitScore(0.85)).toBe(85);
            expect(normalizeFitScore(1)).toBe(100);
            expect(normalizeFitScore(0)).toBe(0);
        });

        it('should keep integer scores as-is', () => {
            expect(normalizeFitScore(55)).toBe(55);
            expect(normalizeFitScore(85)).toBe(85);
        });

        it('should return 0 for null/undefined', () => {
            expect(normalizeFitScore(null)).toBe(0);
            expect(normalizeFitScore(undefined)).toBe(0);
        });

        it('should clamp out of range values', () => {
            expect(normalizeFitScore(150)).toBe(100);
            expect(normalizeFitScore(-10)).toBe(0);
        });

        it('should round decimal results', () => {
            expect(normalizeFitScore(0.555)).toBe(56); // rounds up
            expect(normalizeFitScore(0.554)).toBe(55); // rounds down
        });
    });
});
