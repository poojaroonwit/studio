/**
 * Tests for score calculation logic used in evaluation page
 * Tests: overall score calculation, score filtering, validation
 */

import { describe, it, expect } from 'vitest';

// Score calculation functions extracted from page logic
const calculateOverallScore = (questions: Array<{ score: number }>): number => {
    if (questions.length === 0) return 0;
    const totalScore = questions.reduce((sum, q) => sum + q.score, 0);
    return totalScore / questions.length;
};

const filterValidPersonalityScores = (
    questions: Array<{ traitId: string; score: number; notes?: string }>
): Array<{ traitId: string; score: number; notes: string }> => {
    return questions
        .filter(q => q.score >= 1 && q.score <= 5 && q.traitId && q.traitId.trim() !== '')
        .map(q => ({
            traitId: q.traitId,
            score: q.score,
            notes: q.notes || ''
        }));
};

const filterValidExpertiseScores = (
    results: Array<{ id: string; score: number }>
): Array<{ skillId: string; score: number; notes: string }> => {
    return results
        .filter(tr => tr.score >= 0)
        .map(tr => ({
            skillId: tr.id,
            score: tr.score,
            notes: ''
        }));
};

describe('calculateOverallScore', () => {
    it('should calculate average of all scores', () => {
        const questions = [
            { score: 1 },
            { score: 2 },
            { score: 3 },
            { score: 4 },
            { score: 5 }
        ];
        expect(calculateOverallScore(questions)).toBe(3);
    });

    it('should return 5 when all scores are 5', () => {
        const questions = [
            { score: 5 },
            { score: 5 },
            { score: 5 }
        ];
        expect(calculateOverallScore(questions)).toBe(5);
    });

    it('should return 1 when all scores are 1', () => {
        const questions = [
            { score: 1 },
            { score: 1 },
            { score: 1 }
        ];
        expect(calculateOverallScore(questions)).toBe(1);
    });

    it('should return 0 for empty array', () => {
        expect(calculateOverallScore([])).toBe(0);
    });

    it('should handle single question', () => {
        expect(calculateOverallScore([{ score: 4 }])).toBe(4);
    });

    it('should include zeros in average calculation', () => {
        const questions = [
            { score: 5 },
            { score: 0 },
            { score: 5 }
        ];
        // (5 + 0 + 5) / 3 = 3.33...
        expect(calculateOverallScore(questions)).toBeCloseTo(3.33, 1);
    });

    it('should handle decimal results', () => {
        const questions = [
            { score: 3 },
            { score: 4 }
        ];
        expect(calculateOverallScore(questions)).toBe(3.5);
    });
});

describe('filterValidPersonalityScores', () => {
    it('should filter out scores less than 1', () => {
        const questions = [
            { traitId: 'trait-1', score: 0 },
            { traitId: 'trait-2', score: 3 }
        ];
        const result = filterValidPersonalityScores(questions);
        expect(result).toHaveLength(1);
        expect(result[0].traitId).toBe('trait-2');
    });

    it('should filter out scores greater than 5', () => {
        const questions = [
            { traitId: 'trait-1', score: 6 },
            { traitId: 'trait-2', score: 4 }
        ];
        const result = filterValidPersonalityScores(questions);
        expect(result).toHaveLength(1);
        expect(result[0].traitId).toBe('trait-2');
    });

    it('should filter out empty traitIds', () => {
        const questions = [
            { traitId: '', score: 3 },
            { traitId: '   ', score: 4 },
            { traitId: 'trait-1', score: 5 }
        ];
        const result = filterValidPersonalityScores(questions);
        expect(result).toHaveLength(1);
        expect(result[0].traitId).toBe('trait-1');
    });

    it('should include all valid scores (1-5)', () => {
        const questions = [
            { traitId: 'trait-1', score: 1 },
            { traitId: 'trait-2', score: 2 },
            { traitId: 'trait-3', score: 3 },
            { traitId: 'trait-4', score: 4 },
            { traitId: 'trait-5', score: 5 }
        ];
        const result = filterValidPersonalityScores(questions);
        expect(result).toHaveLength(5);
    });

    it('should default notes to empty string', () => {
        const questions = [
            { traitId: 'trait-1', score: 3 }
        ];
        const result = filterValidPersonalityScores(questions);
        expect(result[0].notes).toBe('');
    });

    it('should preserve existing notes', () => {
        const questions = [
            { traitId: 'trait-1', score: 3, notes: 'Good performance' }
        ];
        const result = filterValidPersonalityScores(questions);
        expect(result[0].notes).toBe('Good performance');
    });
});

describe('filterValidExpertiseScores', () => {
    it('should include scores >= 0', () => {
        const results = [
            { id: 'skill-1', score: 0 },
            { id: 'skill-2', score: 50 },
            { id: 'skill-3', score: 100 }
        ];
        const filtered = filterValidExpertiseScores(results);
        expect(filtered).toHaveLength(3);
    });

    it('should filter out negative scores', () => {
        const results = [
            { id: 'skill-1', score: -1 },
            { id: 'skill-2', score: 50 }
        ];
        const filtered = filterValidExpertiseScores(results);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].skillId).toBe('skill-2');
    });

    it('should map id to skillId', () => {
        const results = [{ id: 'skill-123', score: 75 }];
        const filtered = filterValidExpertiseScores(results);
        expect(filtered[0].skillId).toBe('skill-123');
    });

    it('should add empty notes field', () => {
        const results = [{ id: 'skill-1', score: 50 }];
        const filtered = filterValidExpertiseScores(results);
        expect(filtered[0].notes).toBe('');
    });

    it('should return empty array for empty input', () => {
        expect(filterValidExpertiseScores([])).toHaveLength(0);
    });
});

describe('Score validation edge cases', () => {
    it('should handle mixed valid and invalid scores', () => {
        const questions = [
            { traitId: 'trait-1', score: 0 },   // invalid (0)
            { traitId: 'trait-2', score: 3 },   // valid
            { traitId: '', score: 4 },          // invalid (empty traitId)
            { traitId: 'trait-4', score: 6 },   // invalid (>5)
            { traitId: 'trait-5', score: 5 }    // valid
        ];
        const result = filterValidPersonalityScores(questions);
        expect(result).toHaveLength(2);
        expect(result.map(r => r.traitId)).toEqual(['trait-2', 'trait-5']);
    });

    it('should handle all zeros (no valid answers)', () => {
        const questions = [
            { traitId: 'trait-1', score: 0 },
            { traitId: 'trait-2', score: 0 }
        ];
        const result = filterValidPersonalityScores(questions);
        expect(result).toHaveLength(0);
    });
});
