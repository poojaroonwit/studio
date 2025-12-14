/**
 * Tests for crypto utility functions
 */

import { describe, it, expect } from 'vitest';
import {
    generateSecureRandomString,
    generateSecureFilename,
    generateSecureRandomNumber
} from '../cryptoUtils';

describe('cryptoUtils', () => {
    describe('generateSecureRandomString', () => {
        it('should generate string of default length 16', () => {
            const result = generateSecureRandomString();
            expect(result).toHaveLength(16);
        });

        it('should generate string of specified length', () => {
            expect(generateSecureRandomString(8)).toHaveLength(8);
            expect(generateSecureRandomString(32)).toHaveLength(32);
            expect(generateSecureRandomString(64)).toHaveLength(64);
        });

        it('should generate different strings each time', () => {
            const results = new Set();
            for (let i = 0; i < 100; i++) {
                results.add(generateSecureRandomString(16));
            }
            // All 100 should be unique
            expect(results.size).toBe(100);
        });

        it('should generate URL-safe characters only', () => {
            const result = generateSecureRandomString(100);
            // base64url uses A-Z, a-z, 0-9, -, _
            expect(result).toMatch(/^[A-Za-z0-9_-]+$/);
        });
    });

    describe('generateSecureFilename', () => {
        it('should generate filename of default length 12', () => {
            const result = generateSecureFilename();
            expect(result).toHaveLength(12);
        });

        it('should generate filename of specified length', () => {
            expect(generateSecureFilename(8)).toHaveLength(8);
            expect(generateSecureFilename(24)).toHaveLength(24);
        });

        it('should generate filename-safe characters only', () => {
            const result = generateSecureFilename(50);
            // Should only contain characters safe for filenames
            expect(result).toMatch(/^[A-Za-z0-9_-]+$/);
        });

        it('should generate different filenames each time', () => {
            const results = new Set();
            for (let i = 0; i < 50; i++) {
                results.add(generateSecureFilename());
            }
            expect(results.size).toBe(50);
        });
    });

    describe('generateSecureRandomNumber', () => {
        it('should generate number between 0 and 1 by default', () => {
            for (let i = 0; i < 100; i++) {
                const result = generateSecureRandomNumber();
                expect(result).toBeGreaterThanOrEqual(0);
                expect(result).toBeLessThanOrEqual(1);
            }
        });

        it('should generate number within specified range', () => {
            for (let i = 0; i < 100; i++) {
                const result = generateSecureRandomNumber(10, 20);
                expect(result).toBeGreaterThanOrEqual(10);
                expect(result).toBeLessThanOrEqual(20);
            }
        });

        it('should generate number at min boundary', () => {
            // With small range, should eventually hit min
            const results = new Set();
            for (let i = 0; i < 100; i++) {
                results.add(generateSecureRandomNumber(5, 7));
            }
            expect(results.has(5)).toBe(true);
        });

        it('should generate number at max boundary', () => {
            // With small range, should eventually hit max
            const results = new Set();
            for (let i = 0; i < 100; i++) {
                results.add(generateSecureRandomNumber(5, 7));
            }
            expect(results.has(7)).toBe(true);
        });

        it('should return integer values', () => {
            for (let i = 0; i < 100; i++) {
                const result = generateSecureRandomNumber(1, 100);
                expect(Number.isInteger(result)).toBe(true);
            }
        });
    });
});
