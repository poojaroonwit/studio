import { useState, useEffect, useRef } from 'react';
import { containsThaiText, getFontClass, detectLanguage } from '@/lib/fontUtils';

interface UseThaiFontOptions {
  autoDetect?: boolean;
  defaultFont?: 'thai' | 'english' | 'auto';
}

interface UseThaiFontReturn {
  fontClass: string;
  language: 'thai' | 'english' | 'mixed' | 'other';
  hasThaiText: boolean;
  setText: (text: string) => void;
  forceFont: (font: 'thai' | 'english') => void;
}

/**
 * React hook for automatic Thai font detection and switching
 * @param initialText - Initial text to analyze
 * @param options - Configuration options
 * @returns Object with font class, language detection, and utility functions
 */
export function useThaiFont(
  initialText: string = '',
  options: UseThaiFontOptions = {}
): UseThaiFontReturn {
  const { autoDetect = true, defaultFont = 'auto' } = options;
  
  const [text, setText] = useState(initialText);
  const [forcedFont, setForcedFont] = useState<'thai' | 'english' | null>(null);
  const [fontClass, setFontClass] = useState('font-english');
  const [language, setLanguage] = useState<'thai' | 'english' | 'mixed' | 'other'>('other');
  const [hasThaiText, setHasThaiText] = useState(false);

  // Update font class and language detection when text changes
  useEffect(() => {
    if (!autoDetect && forcedFont) {
      setFontClass(forcedFont === 'thai' ? 'font-thai' : 'font-english');
      return;
    }

    const detectedLanguage = detectLanguage(text);
    const containsThai = containsThaiText(text);
    const newFontClass = getFontClass(text);

    setLanguage(detectedLanguage);
    setHasThaiText(containsThai);
    setFontClass(newFontClass);
  }, [text, autoDetect, forcedFont]);

  // Force a specific font
  const forceFont = (font: 'thai' | 'english') => {
    setForcedFont(font);
    setFontClass(font === 'thai' ? 'font-thai' : 'font-english');
  };

  return {
    fontClass,
    language,
    hasThaiText,
    setText,
    forceFont,
  };
}

/**
 * React hook for automatic font switching on DOM elements
 * @param elementRef - Ref to the DOM element
 * @param text - Text content to analyze
 * @returns Object with font class and utility functions
 */
export function useAutoFont(
  elementRef: React.RefObject<HTMLElement>,
  text: string = ''
) {
  const { fontClass, language, hasThaiText } = useThaiFont(text);

  useEffect(() => {
    if (elementRef.current) {
      const element = elementRef.current;
      
      // Remove existing font classes
      element.classList.remove('font-thai', 'font-english', 'font-auto');
      
      // Add appropriate font class
      element.classList.add(fontClass);
      
      // Set lang attribute for Thai text
      if (hasThaiText) {
        element.setAttribute('lang', 'th');
      } else {
        element.removeAttribute('lang');
      }
    }
  }, [fontClass, hasThaiText, elementRef]);

  return {
    fontClass,
    language,
    hasThaiText,
  };
}

/**
 * React hook for observing text changes in a DOM element
 * @param elementRef - Ref to the DOM element to observe
 * @returns Object with font class and language detection
 */
export function useObserveFont(elementRef: React.RefObject<HTMLElement>) {
  const [fontClass, setFontClass] = useState('font-english');
  const [language, setLanguage] = useState<'thai' | 'english' | 'mixed' | 'other'>('other');

  useEffect(() => {
    if (!elementRef.current) return;

    const element = elementRef.current;
    
    // Initial check
    const checkText = () => {
      const text = element.textContent || '';
      const detectedLanguage = detectLanguage(text);
      const newFontClass = getFontClass(text);
      
      setLanguage(detectedLanguage);
      setFontClass(newFontClass);
    };

    checkText();

    // Observe text changes
    const observer = new MutationObserver(checkText);
    observer.observe(element, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [elementRef]);

  return {
    fontClass,
    language,
  };
} 