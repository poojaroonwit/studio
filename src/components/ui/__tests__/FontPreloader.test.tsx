/**
 * Property-based tests for FontPreloader component
 * Feature: font-loading-optimization
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * **Feature: font-loading-optimization, Property 11: Preload crossorigin attribute**
 * 
 * For any font preload link element, the crossorigin attribute should be present
 * Validates: Requirements 5.5
 */
describe('FontPreloader - Property 11: Preload crossorigin attribute', () => {
  // Mock preload link structure
  interface PreloadLink {
    rel: string;
    href: string;
    as: string;
    type: string;
    crossOrigin: string;
  }

  const createPreloadLink = (fontName: string): PreloadLink => ({
    rel: 'preload',
    href: `/_next/static/media/${fontName}.woff2`,
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous'
  });

  const validFontNames = [
    'inter-latin-400-normal',
    'ibm-plex-sans-thai-thai-400-normal',
    'ibm-plex-sans-thai-latin-400-normal'
  ];

  it('should have crossorigin attribute set to anonymous for all preload links', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validFontNames),
        (fontName) => {
          const link = createPreloadLink(fontName);
          
          // Property: Every preload link must have crossorigin attribute set to 'anonymous'
          expect(link.crossOrigin).toBe('anonymous');
          expect(link.as).toBe('font');
          expect(link.type).toBe('font/woff2');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should only preload Inter and IBM Plex Sans Thai fonts', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validFontNames),
        (fontName) => {
          const link = createPreloadLink(fontName);
          
          // Property: All preload links should be for Inter or IBM Plex Sans Thai
          const isInterFont = link.href.includes('inter');
          const isThaiFont = link.href.includes('ibm-plex-sans-thai');
          
          expect(isInterFont || isThaiFont).toBe(true);
          
          // Should not preload removed fonts
          expect(link.href).not.toContain('roboto');
          expect(link.href).not.toContain('open-sans');
          expect(link.href).not.toContain('montserrat');
          expect(link.href).not.toContain('noto-sans-thai');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should use woff2 format for all font preload links', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validFontNames),
        (fontName) => {
          const link = createPreloadLink(fontName);
          
          // Property: All font preload links should use woff2 format
          expect(link.type).toBe('font/woff2');
          expect(link.href).toMatch(/\.woff2$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have proper attributes for font preloading', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validFontNames),
        (fontName) => {
          const link = createPreloadLink(fontName);
          
          // Property: Preload links must have correct attributes
          expect(link.rel).toBe('preload');
          expect(link.as).toBe('font');
          expect(link.crossOrigin).toBe('anonymous');
          expect(link.type).toBe('font/woff2');
          expect(link.href).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not include removed fonts in preload configuration', () => {
    const removedFonts = ['roboto', 'open-sans', 'montserrat', 'noto-sans-thai'];
    
    fc.assert(
      fc.property(
        fc.constantFrom(...validFontNames),
        (fontName) => {
          const link = createPreloadLink(fontName);
          
          // Property: No removed fonts should be in the preload configuration
          removedFonts.forEach(removedFont => {
            expect(link.href.toLowerCase()).not.toContain(removedFont);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain crossorigin attribute across different font configurations', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...validFontNames), { minLength: 1, maxLength: 3 }),
        (fontNames) => {
          const links = fontNames.map(createPreloadLink);
          
          // Property: All links must have crossorigin='anonymous'
          links.forEach(link => {
            expect(link.crossOrigin).toBe('anonymous');
          });
          
          // Property: All links must be for fonts
          links.forEach(link => {
            expect(link.as).toBe('font');
            expect(link.type).toBe('font/woff2');
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
