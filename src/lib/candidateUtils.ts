import type { Candidate } from '@/lib/types';

/**
 * Formats candidate name as "Title FirstName LastName"
 * Falls back to candidate.name if personal info is not available
 */
export const formatCandidateName = (candidate: Partial<Candidate> & { id: string; name: string }): string => {
  // If candidate is null/undefined or doesn't have required properties, return loading state
  if (!candidate || !candidate.id) {
    return 'Loading...';
  }
  
  const personalInfo = (candidate.parsedData && 'personal_info' in candidate.parsedData)
    ? candidate.parsedData.personal_info
    : undefined;
  
  if (personalInfo) {
    const title = personalInfo.title_honorific?.trim();
    const firstName = personalInfo.firstname?.trim();
    const lastName = personalInfo.lastname?.trim();
    
    const parts = [title, firstName, lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : candidate.name || 'Loading...';
  }
  
  return candidate.name || 'Loading...';
}; 