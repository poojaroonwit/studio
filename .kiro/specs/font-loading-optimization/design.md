# Design Document

## Overview

This design optimizes font loading in the HRI application by reducing the number of loaded fonts from 6 to 2 (Inter for English, IBM Plex Sans Thai for Thai), implementing proper font-display strategies, adding font preloading for critical fonts, and using system fonts as fallbacks with metric matching to prevent layout shifts. The solution prioritizes performance while maintaining visual quality for both Thai and English content.

## Architecture

### Current State
- 6 web fonts loaded from Google Fonts (Inter, IBM Plex Sans Thai, Noto Sans Thai, Roboto, Open Sans, Montserrat)
- All fonts use `display: 'swap'` causing FOUT
- Font preconnect hints exist but fonts still block rendering
- No font subsetting or selective loading
- FontLoader and FontPreloader components exist but may not be optimally configured

### Proposed State
- 2 web fonts: Inter (English) and IBM Plex Sans Thai (Thai)
- Font-display strategy: `optional` for non-critical fonts, `swap` for critical fonts
- Preload critical fonts with proper crossorigin attributes
- System font fallbacks with size-adjust for metric matching
- Conditional font loading based on content language detection
- Remove unused fonts: Noto Sans Thai, Roboto, Open Sans, Montserrat

## Components and Interfaces

### 1. Font Configuration (layout.tsx)

**Responsibilities:**
- Define and configure web fonts using Next.js font optimization
- Set font-display strategies
- Configure fallback fonts with metric matching
- Export font variables for CSS

**Interface:**
```typescript
// Reduced font configuration
const inter = Inter({
  subsets: ['latin'],
  display: 'optional', // Changed from 'swap'
  variable: '--font-inter',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Arial', 'sans-serif'],
  adjustFontFallback: true, // Enable metric matching
});

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap', // Keep swap for Thai as it's critical
  variable: '--font-ibm-plex-sans-thai',
  fallback: ['system-ui', '-apple-system', 'Tahoma', 'Arial', 'sans-serif'],
  adjustFontFallback: true,
});
```

### 2. Font Preloader Component

**Responsibilities:**
- Preload critical fonts for above-the-fold content
- Add proper crossorigin attributes
- Conditionally preload based on detected language

**Interface:**
```typescript
interface FontPreloaderProps {
  criticalFonts?: string[];
  detectLanguage?: boolean;
}

export function FontPreloader({ 
  criticalFonts = ['inter', 'ibm-plex-sans-thai'],
  detectLanguage = true 
}: FontPreloaderProps): JSX.Element
```

### 3. Font Loader Component

**Responsibilities:**
- Detect when fonts have loaded
- Apply loaded state to document
- Handle font loading errors gracefully
- Provide loading state to child components

**Interface:**
```typescript
interface FontLoaderProps {
  children: React.ReactNode;
  fonts?: string[];
  timeout?: number;
}

export function FontLoader({ 
  children, 
  fonts = ['Inter', 'IBM Plex Sans Thai'],
  timeout = 3000 
}: FontLoaderProps): JSX.Element
```

### 4. Font Utilities (fontUtils.ts)

**Responsibilities:**
- Detect language from text content
- Return appropriate font family
- Provide font class names
- Handle mixed-language content

**Interface:**
```typescript
// Existing functions remain, but simplified
export function containsThaiText(text: string): boolean;
export function getFontClass(text: string): string;
export function getFontFamily(text: string): string;
export function detectLanguage(text: string): 'thai' | 'english' | 'mixed' | 'other';
```

### 5. CSS Font Configuration (globals.css)

**Responsibilities:**
- Define CSS custom properties for fonts
- Set up fallback font stacks
- Apply size-adjust for metric matching
- Define font-display behavior

## Data Models

### Font Configuration Object
```typescript
interface FontConfig {
  family: string;
  variable: string;
  display: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  subsets: string[];
  weights: string[];
  fallback: string[];
  adjustFontFallback: boolean;
  preload: boolean;
}
```

### Font Loading State
```typescript
interface FontLoadingState {
  loaded: boolean;
  error: boolean;
  fonts: {
    [fontFamily: string]: {
      loaded: boolean;
      error: boolean;
    };
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

