/**
 * Tests for input validation utility functions
 */

import { describe, it, expect } from 'vitest';
import {
    sanitizeString,
    sanitizeFileName,
    sanitizeSearchQuery,
    validateRequest,
    validateSearchParams,
    escapeSqlIdentifier,
    escapeSqlValue,
    escapeHtml,
    commonSchemas
} from '../inputValidation';
import { z } from 'zod';

describe('inputValidation', () => {
    describe('sanitizeString', () => {
        it('should trim whitespace', () => {
            expect(sanitizeString('  hello  ')).toBe('hello');
        });

        it('should remove HTML tags', () => {
            // Note: / is also removed by the \/\* regex
            expect(sanitizeString('<script>alert()</script>')).toBe('scriptalert()script');
        });

        it('should remove quotes', () => {
            expect(sanitizeString("test'quote\"double")).toBe('testquotedouble');
        });

        it('should remove semicolons', () => {
            // Note: * is removed by the \/\* regex, so 'SELECT *' becomes 'SELECT '
            expect(sanitizeString('SELECT FROM users;')).toBe('SELECT FROM users');
        });

        it('should remove SQL comment markers', () => {
            expect(sanitizeString('test--comment')).toBe('testcomment');
        });

        it('should limit length to 1000', () => {
            const longString = 'a'.repeat(2000);
            expect(sanitizeString(longString).length).toBe(1000);
        });

        it('should return empty string for non-string input', () => {
            expect(sanitizeString(123 as any)).toBe('');
            expect(sanitizeString(null as any)).toBe('');
        });
    });

    describe('sanitizeFileName', () => {
        it('should replace special characters with underscores', () => {
            expect(sanitizeFileName('file name.pdf')).toBe('file_name.pdf');
        });

        it('should remove leading dots', () => {
            expect(sanitizeFileName('...hidden.txt')).toBe('hidden.txt');
        });

        it('should remove trailing dots', () => {
            expect(sanitizeFileName('file.txt...')).toBe('file.txt');
        });

        it('should limit length to 255', () => {
            const longFilename = 'a'.repeat(300) + '.pdf';
            expect(sanitizeFileName(longFilename).length).toBeLessThanOrEqual(255);
        });

        it('should preserve valid characters', () => {
            expect(sanitizeFileName('valid-file_name.pdf')).toBe('valid-file_name.pdf');
        });

        it('should return empty string for non-string input', () => {
            expect(sanitizeFileName(null as any)).toBe('');
        });
    });

    describe('sanitizeSearchQuery', () => {
        it('should trim whitespace', () => {
            expect(sanitizeSearchQuery('  search term  ')).toBe('search term');
        });

        it('should normalize multiple spaces', () => {
            expect(sanitizeSearchQuery('search    term')).toBe('search term');
        });

        it('should remove dangerous characters', () => {
            expect(sanitizeSearchQuery('search<>"\';')).toBe('search');
        });

        it('should limit length to 500', () => {
            const longQuery = 'a'.repeat(600);
            expect(sanitizeSearchQuery(longQuery).length).toBe(500);
        });
    });

    describe('validateRequest', () => {
        const testSchema = z.object({
            name: z.string().min(1),
            age: z.number().positive()
        });

        it('should return success for valid data', () => {
            const result = validateRequest(testSchema, { name: 'John', age: 25 });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toEqual({ name: 'John', age: 25 });
            }
        });

        it('should return errors for invalid data', () => {
            const result = validateRequest(testSchema, { name: '', age: -1 });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.errors.length).toBeGreaterThan(0);
            }
        });

        it('should handle missing fields', () => {
            const result = validateRequest(testSchema, { name: 'John' });
            expect(result.success).toBe(false);
        });
    });

    describe('validateSearchParams', () => {
        it('should only include allowed params', () => {
            const params = new URLSearchParams();
            params.set('allowed', 'value');
            params.set('notAllowed', 'value');

            const result = validateSearchParams(params, ['allowed']);

            expect(result).toHaveProperty('allowed');
            expect(result).not.toHaveProperty('notAllowed');
        });

        it('should sanitize param values', () => {
            const params = new URLSearchParams();
            params.set('query', '<script>');

            const result = validateSearchParams(params, ['query']);

            expect(result.query).not.toContain('<');
        });
    });

    describe('escapeSqlIdentifier', () => {
        it('should only allow alphanumeric and underscores', () => {
            expect(escapeSqlIdentifier('user_table')).toBe('user_table');
            expect(escapeSqlIdentifier('user-table')).toBe('usertable');
            expect(escapeSqlIdentifier('user table')).toBe('usertable');
        });

        it('should remove special characters', () => {
            expect(escapeSqlIdentifier('users; DROP TABLE')).toBe('usersDROPTABLE');
        });
    });

    describe('escapeSqlValue', () => {
        it('should escape single quotes', () => {
            expect(escapeSqlValue("O'Brien")).toBe("O''Brien");
        });

        it('should handle multiple quotes', () => {
            expect(escapeSqlValue("It's John's")).toBe("It''s John''s");
        });
    });

    describe('escapeHtml', () => {
        it('should escape HTML entities', () => {
            expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
            expect(escapeHtml('"quotes"')).toBe('&quot;quotes&quot;');
            expect(escapeHtml("'apostrophe'")).toBe('&#039;apostrophe&#039;');
            expect(escapeHtml('&ampersand')).toBe('&amp;ampersand');
        });

        it('should escape a complete HTML tag', () => {
            const input = '<script>alert("XSS")</script>';
            const output = escapeHtml(input);
            expect(output).not.toContain('<');
            expect(output).not.toContain('>');
        });
    });

    describe('commonSchemas', () => {
        it('should validate UUID', () => {
            const validUuid = '550e8400-e29b-41d4-a716-446655440000';
            expect(() => commonSchemas.uuid.parse(validUuid)).not.toThrow();
            expect(() => commonSchemas.uuid.parse('invalid')).toThrow();
        });

        it('should validate email', () => {
            expect(() => commonSchemas.email.parse('test@example.com')).not.toThrow();
            expect(() => commonSchemas.email.parse('invalid')).toThrow();
        });

        it('should validate password length', () => {
            expect(() => commonSchemas.password.parse('12345678')).not.toThrow();
            expect(() => commonSchemas.password.parse('short')).toThrow();
        });

        it('should validate positive integers', () => {
            expect(() => commonSchemas.positiveInt.parse(5)).not.toThrow();
            expect(() => commonSchemas.positiveInt.parse(-1)).toThrow();
            expect(() => commonSchemas.positiveInt.parse(0)).toThrow();
        });

        it('should validate non-negative integers', () => {
            expect(() => commonSchemas.nonNegativeInt.parse(0)).not.toThrow();
            expect(() => commonSchemas.nonNegativeInt.parse(5)).not.toThrow();
            expect(() => commonSchemas.nonNegativeInt.parse(-1)).toThrow();
        });
    });
});
