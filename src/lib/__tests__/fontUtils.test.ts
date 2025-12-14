/**
 * Tests for font utility functions
 */

import { describe, it, expect } from 'vitest';
import {
    containsThaiText,
    getFontClass,
    getFontFamily,
    createMixedFontClass,
    detectLanguage,
    getThaiFontWeight
} from '../fontUtils';

describe('fontUtils', () => {
    describe('containsThaiText', () => {
        it('should return true for Thai text', () => {
            expect(containsThaiText('สวัสดี')).toBe(true);
            expect(containsThaiText('ก')).toBe(true);
            expect(containsThaiText('ภาษาไทย')).toBe(true);
        });

        it('should return false for English text', () => {
            expect(containsThaiText('Hello')).toBe(false);
            expect(containsThaiText('Test string')).toBe(false);
        });

        it('should return true for mixed Thai/English text', () => {
            expect(containsThaiText('Hello สวัสดี World')).toBe(true);
            expect(containsThaiText('Name: สมชาย')).toBe(true);
        });

        it('should return false for empty or null text', () => {
            expect(containsThaiText('')).toBe(false);
            expect(containsThaiText(null as any)).toBe(false);
            expect(containsThaiText(undefined as any)).toBe(false);
        });

        it('should return false for numbers only', () => {
            expect(containsThaiText('12345')).toBe(false);
        });
    });

    describe('getFontClass', () => {
        it('should return font-thai for Thai text', () => {
            expect(getFontClass('สวัสดี')).toBe('font-thai');
        });

        it('should return font-english for English text', () => {
            expect(getFontClass('Hello')).toBe('font-english');
        });

        it('should return font-english for empty text', () => {
            expect(getFontClass('')).toBe('font-english');
            expect(getFontClass(null as any)).toBe('font-english');
        });

        it('should return font-thai for mixed text', () => {
            expect(getFontClass('Hello สวัสดี')).toBe('font-thai');
        });
    });

    describe('getFontFamily', () => {
        it('should return Thai font family for Thai text', () => {
            const result = getFontFamily('สวัสดี');
            expect(result).toContain('ibm-plex-sans-thai');
        });

        it('should return English font family for English text', () => {
            const result = getFontFamily('Hello');
            expect(result).toContain('inter');
            expect(result).not.toContain('ibm-plex-sans-thai');
        });

        it('should return English font family for empty text', () => {
            const result = getFontFamily('');
            expect(result).toContain('inter');
        });
    });

    describe('createMixedFontClass', () => {
        it('should create CSS with base class name', () => {
            const result = createMixedFontClass('myClass');
            expect(result).toContain('.myClass');
        });

        it('should include lang attribute selectors', () => {
            const result = createMixedFontClass('test');
            expect(result).toContain('[lang="th"]');
            expect(result).toContain('[lang="th-TH"]');
        });

        it('should include Thai font for lang selectors', () => {
            const result = createMixedFontClass('test');
            expect(result).toContain('ibm-plex-sans-thai');
        });
    });

    describe('detectLanguage', () => {
        it('should detect Thai text', () => {
            expect(detectLanguage('สวัสดี')).toBe('thai');
        });

        it('should detect English text', () => {
            expect(detectLanguage('Hello World')).toBe('english');
        });

        it('should detect mixed text', () => {
            expect(detectLanguage('Hello สวัสดี')).toBe('mixed');
        });

        it('should detect other for numbers only', () => {
            expect(detectLanguage('12345')).toBe('other');
        });

        it('should detect other for special characters', () => {
            expect(detectLanguage('!@#$%')).toBe('other');
        });

        it('should return other for empty text', () => {
            expect(detectLanguage('')).toBe('other');
            expect(detectLanguage(null as any)).toBe('other');
        });
    });

    describe('getThaiFontWeight', () => {
        it('should return supported weights as-is', () => {
            expect(getThaiFontWeight('400')).toBe('400');
            expect(getThaiFontWeight('500')).toBe('500');
            expect(getThaiFontWeight('600')).toBe('600');
            expect(getThaiFontWeight('700')).toBe('700');
        });

        it('should fallback to 400 for unsupported weights', () => {
            expect(getThaiFontWeight('100')).toBe('400');
            expect(getThaiFontWeight('200')).toBe('400');
            expect(getThaiFontWeight('300')).toBe('400');
            expect(getThaiFontWeight('800')).toBe('400');
            expect(getThaiFontWeight('900')).toBe('400');
        });

        it('should fallback to 400 for invalid weights', () => {
            expect(getThaiFontWeight('bold')).toBe('400');
            expect(getThaiFontWeight('normal')).toBe('400');
            expect(getThaiFontWeight('')).toBe('400');
        });
    });
});
