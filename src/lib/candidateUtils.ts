import type { Candidate } from '@/lib/types';
import { containsThaiText, getFontClass } from './fontUtils';

/**
 * Formats candidate name as "Title FirstName LastName" or "FirstName LastName"
 * Falls back to candidate.name if personal info is not available
 * @param includeTitle - Whether to include the title in the formatted name (default: true)
 */
export const formatCandidateName = (candidate: Partial<Candidate> & { id: string; name: string }, includeTitle: boolean = true): string => {
  // If candidate is null/undefined or doesn't have required properties, return loading state
  if (!candidate || !candidate.id) {
    return 'Loading...';
  }
  
  const personalInfo = (candidate.parsedData && 'personal_info' in candidate.parsedData)
    ? candidate.parsedData.personal_info
    : undefined;
  
  if (personalInfo) {
    const title = includeTitle ? personalInfo.title_honorific?.trim() : undefined;
    const firstName = personalInfo.firstname?.trim();
    const lastName = personalInfo.lastname?.trim();
    
    const parts = [title, firstName, lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : candidate.name || 'Loading...';
  }
  
  return candidate.name || 'Loading...';
};

/**
 * Gets the raw candidate name without title (FirstName LastName)
 * Falls back to candidate.name if personal info is not available
 */
export const getRawCandidateName = (candidate: Partial<Candidate> & { id: string; name: string }): string => {
  return formatCandidateName(candidate, false);
};

/**
 * Gets the appropriate font class for candidate name
 * @param candidate - The candidate object
 * @returns CSS class for the appropriate font
 */
export const getCandidateNameFontClass = (candidate: Partial<Candidate> & { id: string; name: string }): string => {
  const name = formatCandidateName(candidate);
  return getFontClass(name);
};

/**
 * Checks if candidate name contains Thai text
 * @param candidate - The candidate object
 * @returns boolean indicating if name contains Thai characters
 */
export const hasThaiName = (candidate: Partial<Candidate> & { id: string; name: string }): boolean => {
  const name = formatCandidateName(candidate);
  return containsThaiText(name);
};

/**
 * Formats candidate name with proper language attribute
 * @param candidate - The candidate object
 * @returns Object with formatted name and language attributes
 */
export const formatCandidateNameWithLang = (candidate: Partial<Candidate> & { id: string; name: string }) => {
  const name = formatCandidateName(candidate);
  const hasThai = containsThaiText(name);
  
  return {
    name,
    lang: hasThai ? 'th' : 'en',
    fontClass: getFontClass(name),
    hasThai
  };
}; 