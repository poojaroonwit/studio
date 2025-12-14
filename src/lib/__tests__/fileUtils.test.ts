/**
 * Tests for file utility functions
 */

import { describe, it, expect } from 'vitest';
import {
    sanitizeFilename,
    generateUniqueFilename,
    extractOriginalFilename
} from '../fileUtils';

describe('fileUtils', () => {
    describe('sanitizeFilename', () => {
        it('should replace special characters with underscores', () => {
            expect(sanitizeFilename('file name.pdf')).toBe('file_name.pdf');
            expect(sanitizeFilename('file@name#test.pdf')).toBe('file_name_test.pdf');
        });

        it('should handle multiple consecutive dots', () => {
            expect(sanitizeFilename('file...name.pdf')).toBe('file.name.pdf');
        });

        it('should replace multiple underscores with single', () => {
            expect(sanitizeFilename('file___name.pdf')).toBe('file_name.pdf');
        });

        it('should remove leading underscores', () => {
            expect(sanitizeFilename('___filename.pdf')).toBe('filename.pdf');
        });

        it('should remove trailing underscores', () => {
            // Note: The regex ^_+|_+$ removes leading/trailing underscores
            // But 'filename___.pdf' -> 'filename_.pdf' because underscore before . is not at end
            expect(sanitizeFilename('test___')).toBe('test');
        });

        it('should preserve valid filenames', () => {
            expect(sanitizeFilename('valid-file_name.pdf')).toBe('valid-file_name.pdf');
            expect(sanitizeFilename('Resume2024.pdf')).toBe('Resume2024.pdf');
        });

        it('should handle Thai characters', () => {
            const result = sanitizeFilename('เอกสาร.pdf');
            // Thai characters should be replaced with underscores
            expect(result).not.toContain('เ');
            expect(result).toContain('.pdf');
        });

        it('should handle empty strings', () => {
            expect(sanitizeFilename('')).toBe('');
        });
    });

    describe('generateUniqueFilename', () => {
        it('should generate unique filename with timestamp', () => {
            const original = 'resume.pdf';
            const result = generateUniqueFilename(original);

            expect(result).toContain('resume');
            expect(result).toContain('.pdf');
            expect(result).toMatch(/_\d+_/); // timestamp pattern
        });

        it('should include jobId when provided', () => {
            const original = 'resume.pdf';
            const jobId = 'job-123';
            const result = generateUniqueFilename(original, jobId);

            expect(result).toContain('job-123');
        });

        it('should preserve extension', () => {
            expect(generateUniqueFilename('doc.docx')).toContain('.docx');
            expect(generateUniqueFilename('image.png')).toContain('.png');
            expect(generateUniqueFilename('file.PDF')).toContain('.PDF');
        });

        it('should use pdf as default extension when none provided', () => {
            const result = generateUniqueFilename('noextension');
            expect(result).toContain('.pdf');
        });

        it('should sanitize the base name', () => {
            const result = generateUniqueFilename('file with spaces.pdf');
            expect(result).not.toContain(' ');
            expect(result).toContain('file_with_spaces');
        });

        it('should generate different filenames for same input', async () => {
            const original = 'test.pdf';
            const result1 = generateUniqueFilename(original);

            // Wait a tiny bit to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 5));

            const result2 = generateUniqueFilename(original);

            // Results should be different due to timestamp/UUID
            expect(result1).not.toBe(result2);
        });
    });

    describe('extractOriginalFilename', () => {
        it('should extract original filename from unique filename', () => {
            // Format: baseName_timestamp_uuid.ext
            const unique = 'resume_1234567890_abc-123.pdf';
            const result = extractOriginalFilename(unique);

            expect(result).toBe('resume');
        });

        it('should return original if not a generated filename', () => {
            const original = 'simple.pdf';
            expect(extractOriginalFilename(original)).toBe('simple.pdf');
        });

        it('should handle filenames with underscores in original name', () => {
            const unique = 'my_resume_2024_1234567890_abc-123.pdf';
            const result = extractOriginalFilename(unique);

            expect(result).toBe('my_resume_2024');
        });

        it('should handle short filenames', () => {
            expect(extractOriginalFilename('a_b.pdf')).toBe('a_b.pdf');
            expect(extractOriginalFilename('test.pdf')).toBe('test.pdf');
        });
    });
});
