/**
 * Unit tests for evaluate page utility functions
 * Tests: formatPersonalityScore, buildPreviewUrl, isImageFile, isPdfFile, isDocumentFile, getScoreColor
 */

import { describe, it, expect } from 'vitest';
import {
    formatPersonalityScore,
    buildPreviewUrl,
    isImageFile,
    isPdfFile,
    isDocumentFile,
    getScoreColor
} from '../utils';

describe('formatPersonalityScore', () => {
    it('should format whole numbers without decimals', () => {
        expect(formatPersonalityScore(5)).toBe('5');
        expect(formatPersonalityScore(1)).toBe('1');
        expect(formatPersonalityScore(0)).toBe('0');
    });

    it('should format decimal numbers with 1 decimal place', () => {
        expect(formatPersonalityScore(3.75)).toBe('3.8');
        expect(formatPersonalityScore(4.25)).toBe('4.3');
        expect(formatPersonalityScore(2.1)).toBe('2.1');
    });

    it('should handle edge cases', () => {
        expect(formatPersonalityScore(0.5)).toBe('0.5');
        expect(formatPersonalityScore(5.0)).toBe('5');
        expect(formatPersonalityScore(3.99)).toBe('4.0');
    });
});

describe('buildPreviewUrl', () => {
    const candidateId = 'test-candidate-123';

    it('should build URL with filePath', () => {
        const att = { filePath: '/uploads/resume.pdf', fileName: 'resume.pdf' };
        const url = buildPreviewUrl(att, candidateId);

        expect(url).toContain('/api/secure-file/preview');
        expect(url).toContain('filePath=%2Fuploads%2Fresume.pdf');
        expect(url).toContain('fileName=resume.pdf');
        expect(url).toContain('candidateId=test-candidate-123');
    });

    it('should add thumbnail parameter when requested', () => {
        const att = { filePath: '/uploads/image.jpg', fileName: 'image.jpg' };
        const url = buildPreviewUrl(att, candidateId, true);

        expect(url).toContain('thumbnail=true');
    });

    it('should handle legacy URL format', () => {
        const att = { url: 'http://localhost:8021/api/secure-file/stream?file=test.pdf' };
        const url = buildPreviewUrl(att, candidateId);

        expect(url).toContain('/api/secure-file/preview');
    });

    it('should return empty string for missing data', () => {
        const att = {};
        const url = buildPreviewUrl(att, candidateId);

        expect(url).toBe('');
    });
});

describe('isImageFile', () => {
    it('should return true for valid image extensions', () => {
        expect(isImageFile('photo.jpg')).toBe(true);
        expect(isImageFile('photo.jpeg')).toBe(true);
        expect(isImageFile('photo.png')).toBe(true);
        expect(isImageFile('photo.gif')).toBe(true);
        expect(isImageFile('photo.bmp')).toBe(true);
        expect(isImageFile('photo.webp')).toBe(true);
    });

    it('should return true for uppercase extensions', () => {
        expect(isImageFile('photo.JPG')).toBe(true);
        expect(isImageFile('photo.PNG')).toBe(true);
    });

    it('should return false for non-image extensions', () => {
        expect(isImageFile('document.pdf')).toBe(false);
        expect(isImageFile('document.doc')).toBe(false);
        expect(isImageFile('document.txt')).toBe(false);
    });

    it('should return false for empty or missing filename', () => {
        expect(isImageFile('')).toBe(false);
    });
});

describe('isPdfFile', () => {
    it('should return true for PDF files', () => {
        expect(isPdfFile('document.pdf')).toBe(true);
        expect(isPdfFile('document.PDF')).toBe(true);
    });

    it('should return false for non-PDF files', () => {
        expect(isPdfFile('document.doc')).toBe(false);
        expect(isPdfFile('photo.jpg')).toBe(false);
        expect(isPdfFile('')).toBe(false);
    });
});

describe('isDocumentFile', () => {
    it('should return true for document extensions', () => {
        expect(isDocumentFile('file.doc')).toBe(true);
        expect(isDocumentFile('file.docx')).toBe(true);
        expect(isDocumentFile('file.xls')).toBe(true);
        expect(isDocumentFile('file.xlsx')).toBe(true);
        expect(isDocumentFile('file.ppt')).toBe(true);
        expect(isDocumentFile('file.pptx')).toBe(true);
        expect(isDocumentFile('file.txt')).toBe(true);
        expect(isDocumentFile('file.rtf')).toBe(true);
    });

    it('should return false for non-document files', () => {
        expect(isDocumentFile('file.pdf')).toBe(false);
        expect(isDocumentFile('file.jpg')).toBe(false);
        expect(isDocumentFile('')).toBe(false);
    });
});

describe('getScoreColor', () => {
    it('should return red for score 1', () => {
        const result = getScoreColor(1);
        expect(result.bgColor).toBe('#E84040');
        expect(result.bg).toBe('bg-[#E84040]');
    });

    it('should return orange for score 2', () => {
        const result = getScoreColor(2);
        expect(result.bgColor).toBe('#F4A340');
    });

    it('should return yellow for score 3', () => {
        const result = getScoreColor(3);
        expect(result.bgColor).toBe('#F1D24A');
    });

    it('should return light green for score 4', () => {
        const result = getScoreColor(4);
        expect(result.bgColor).toBe('#63E25F');
    });

    it('should return dark green for score 5', () => {
        const result = getScoreColor(5);
        expect(result.bgColor).toBe('#2E7D32');
    });

    it('should return muted for score 0 or undefined', () => {
        const result = getScoreColor(0);
        expect(result.bg).toBe('bg-muted');
        expect(result.bgColor).toBe('#6b7280');
    });

    it('should return muted for invalid scores', () => {
        const result = getScoreColor(6);
        expect(result.bg).toBe('bg-muted');
    });
});
