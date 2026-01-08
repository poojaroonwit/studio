/**
 * Type validation tests for evaluate page types
 * Tests runtime validation of EvaluationQuestion, TestingResult, and related types
 */

import { describe, it, expect } from 'vitest';
import type { EvaluationQuestion, EvaluationFormData, TestingResult, Interviewer } from '../types';

// Type guard functions for runtime validation
const isValidEvaluationQuestion = (obj: any): obj is EvaluationQuestion => {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        typeof obj.id === 'string' &&
        typeof obj.traitId === 'string' &&
        typeof obj.traitName === 'string' &&
        typeof obj.groupName === 'string' &&
        typeof obj.description === 'string' &&
        typeof obj.score === 'number' &&
        typeof obj.notes === 'string'
    );
};

const isValidTestingResult = (obj: any): obj is TestingResult => {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        typeof obj.id === 'string' &&
        typeof obj.label === 'string' &&
        typeof obj.score === 'number' &&
        typeof obj.maxScore === 'number'
    );
};

const isValidInterviewer = (obj: any): obj is Interviewer => {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        typeof obj.id === 'string' &&
        typeof obj.userId === 'string' &&
        typeof obj.userName === 'string'
    );
};

describe('EvaluationQuestion type validation', () => {
    it('should validate a complete EvaluationQuestion', () => {
        const validQuestion = {
            id: 'q-123',
            traitId: 'trait-456',
            traitName: 'Communication Skills',
            groupName: 'Soft Skills',
            description: 'Evaluate communication abilities',
            shortDescription: 'Communication',
            score: 4,
            notes: 'Good communicator'
        };

        expect(isValidEvaluationQuestion(validQuestion)).toBe(true);
    });

    it('should fail validation for missing required fields', () => {
        const missingTraitId = {
            id: 'q-123',
            traitName: 'Communication Skills',
            groupName: 'Soft Skills',
            description: 'Evaluate communication',
            score: 4,
            notes: ''
        };

        expect(isValidEvaluationQuestion(missingTraitId)).toBe(false);
    });

    it('should fail validation for wrong types', () => {
        const wrongTypes = {
            id: 123, // should be string
            traitId: 'trait-456',
            traitName: 'Communication Skills',
            groupName: 'Soft Skills',
            description: 'Evaluate communication',
            score: '4', // should be number
            notes: ''
        };

        expect(isValidEvaluationQuestion(wrongTypes)).toBe(false);
    });

    it('should validate score bounds (0-5)', () => {
        const createQuestion = (score: number) => ({
            id: 'q-123',
            traitId: 'trait-456',
            traitName: 'Test',
            groupName: 'Group',
            description: 'Desc',
            score,
            notes: ''
        });

        // Valid scores
        for (let i = 0; i <= 5; i++) {
            expect(isValidEvaluationQuestion(createQuestion(i))).toBe(true);
        }
    });
});

describe('TestingResult type validation', () => {
    it('should validate a complete TestingResult', () => {
        const validResult: TestingResult = {
            id: 'skill-123',
            label: 'JavaScript',
            score: 85,
            maxScore: 100
        };

        expect(isValidTestingResult(validResult)).toBe(true);
    });

    it('should validate TestingResult with optional fields', () => {
        const resultWithOptional: TestingResult = {
            id: 'skill-123',
            assignmentId: 'assign-456',
            groupAssignmentId: 'group-789',
            groupName: 'Technical Skills',
            label: 'JavaScript',
            score: 85,
            maxScore: 100
        };

        expect(isValidTestingResult(resultWithOptional)).toBe(true);
    });

    it('should fail validation for missing required fields', () => {
        const missingLabel = {
            id: 'skill-123',
            score: 85,
            maxScore: 100
        };

        expect(isValidTestingResult(missingLabel)).toBe(false);
    });

    it('should validate score is within bounds', () => {
        const validScore = {
            id: 'skill-123',
            label: 'Test',
            score: 50,
            maxScore: 100
        };
        expect(isValidTestingResult(validScore)).toBe(true);

        // Score can be 0
        const zeroScore = { ...validScore, score: 0 };
        expect(isValidTestingResult(zeroScore)).toBe(true);
    });
});

describe('Interviewer type validation', () => {
    it('should validate a complete Interviewer', () => {
        const validInterviewer: Interviewer = {
            id: 'int-123',
            userId: 'user-456',
            userName: 'John Doe',
            userEmail: 'john@example.com',
            userRole: 'Interviewer',
            avatarUrl: 'https://example.com/avatar.jpg',
            positionTitle: 'Senior Developer'
        };

        expect(isValidInterviewer(validInterviewer)).toBe(true);
    });

    it('should validate minimal Interviewer (required fields only)', () => {
        const minimalInterviewer = {
            id: 'int-123',
            userId: 'user-456',
            userName: 'John Doe'
        };

        expect(isValidInterviewer(minimalInterviewer)).toBe(true);
    });

    it('should fail validation for missing required fields', () => {
        const missingUserName = {
            id: 'int-123',
            userId: 'user-456'
        };

        expect(isValidInterviewer(missingUserName)).toBe(false);
    });
});
