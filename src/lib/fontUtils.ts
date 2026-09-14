/**
 * Font utility functions for handling Thai and English text.
 *
 * Typography is intentionally resolved through the same application stack used
 * by global CSS. Components should not choose an unrelated font per language;
 * IBM Plex Sans remains the primary face and IBM Plex Sans Thai is its fallback
 * for Thai glyphs and mixed-language content.
 */

export const APP_FONT_FAMILY =
  "var(--app-font-family, var(--font-ibm-plex-sans), 'IBM Plex Sans', var(--font-ibm-plex-sans-thai), 'IBM Plex Sans Thai', sans-serif)";

/** Check if text contains Thai characters. */
export function containsThaiText(text: string): boolean {
  if (!text) return false;
  return /[\u0E00-\u0E7F]/.test(text);
}

/**
 * Keep legacy language-aware class callers compatible while resolving every
 * class through the shared application font stack in typography.css.
 */
export function getFontClass(text: string): string {
  if (!text) return 'font-english';
  return containsThaiText(text) ? 'font-thai' : 'font-english';
}

/** Return the same semantic font family used by the application root. */
export function getFontFamily(_text: string): string {
  return APP_FONT_FAMILY;
}

/** Apply the semantic language class without introducing a separate typeface. */
export function applyAutoFont(element: HTMLElement): void {
  const text = element.textContent || '';
  const fontClass = getFontClass(text);

  element.classList.remove('font-thai', 'font-english', 'font-auto');
  element.classList.add(fontClass);
}

/** Create a CSS class that inherits the shared application typography stack. */
export function createMixedFontClass(className: string): string {
  return `
    .${className} {
      font-family: var(--app-font-family);
    }
    .${className} [lang="th"],
    .${className} [lang="th-TH"] {
      font-family: var(--app-font-family);
    }
  `;
}

/** Detect the primary language represented in a text value. */
export function detectLanguage(text: string): 'thai' | 'english' | 'mixed' | 'other' {
  if (!text) return 'other';

  const hasThai = containsThaiText(text);
  const hasEnglish = /[a-zA-Z]/.test(text);

  if (hasThai && hasEnglish) return 'mixed';
  if (hasThai) return 'thai';
  if (hasEnglish) return 'english';
  return 'other';
}

/** IBM Plex Sans Thai supports the application weights below. */
export function getThaiFontWeight(weight: string): string {
  const supportedWeights = ['400', '500', '600', '700'];
  return supportedWeights.includes(weight) ? weight : '400';
}
