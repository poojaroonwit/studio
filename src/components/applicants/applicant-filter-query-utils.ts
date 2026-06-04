import { parseISO } from 'date-fns';
import type { ApplicantFilterValues } from '@/lib/types';

export const SKILL_OPTIONS = [
  'React', 'Python', 'AWS', 'Java', 'SQL', 'JavaScript', 'TypeScript', 'Node.js', 'Docker', 'Kubernetes', 'C#', 'C++', 'Go', 'Ruby', 'PHP', 'HTML', 'CSS', 'Angular', 'Vue', 'Swift', 'Objective-C', 'Scala', 'Perl', 'R', 'MATLAB', 'Azure', 'GCP', 'Linux', 'Windows', 'iOS', 'Android', 'Flutter', 'Spring', 'Django', 'Flask', 'Express', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'GraphQL', 'REST', 'SOAP', 'Jenkins', 'CI/CD', 'Terraform', 'Ansible', 'Puppet', 'Figma', 'Sketch', 'Zeplin', 'Jira', 'Confluence', 'Salesforce', 'SAP', 'PowerBI', 'Tableau', 'Excel', 'Other'
];

const VALID_ADVANCED_QUERY_FIELDS = [
  'name', 'email', 'phone', 'skills', 'location', 'status', 'position', 'positionid',
  'recruiter', 'recruiterid', 'selectedsourceids', 'education', 'minfitscore', 'maxfitscore',
  'minappliedjobfitscore', 'maxappliedjobfitscore', 'matchingfitscore',
  'matchingfitscoremin', 'matchingfitscoremax', 'minmatchingjobfitscore', 'maxmatchingjobfitscore',
  'minexperienceyears', 'maxexperienceyears', 'applicationdatestart', 'applicationdateend', 'locationoperator'
];

export function validateAdvancedQuery(query: string): { isValid: boolean; error?: string; suggestions?: string[] } {
  if (!query.trim()) {
    return { isValid: true };
  }

  const parts = query.split(' ').filter(part => part.includes(':'));

  for (const part of parts) {
    const colonIndex = part.indexOf(':');
    if (colonIndex === -1) {
      return {
        isValid: false,
        error: `Invalid syntax: "${part}". Use format "field:value"`,
        suggestions: ['Use format field:value (e.g., name:John)']
      };
    }

    const key = part.substring(0, colonIndex);
    const value = part.substring(colonIndex + 1);

    if (!key || !value) {
      return {
        isValid: false,
        error: `Empty field or value in "${part}"`,
        suggestions: ['Ensure both field and value are provided (e.g., name:John)']
      };
    }

    if (!VALID_ADVANCED_QUERY_FIELDS.includes(key.toLowerCase())) {
      const suggestions = VALID_ADVANCED_QUERY_FIELDS.filter(field =>
        field.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(field.toLowerCase())
      );
      return {
        isValid: false,
        error: `Unknown field: "${key}"`,
        suggestions: suggestions.length > 0
          ? [`Did you mean: ${suggestions.join(', ')}?`]
          : [`Valid fields: ${VALID_ADVANCED_QUERY_FIELDS.slice(0, 5).join(', ')}...`]
      };
    }

    if (['minfitscore', 'maxfitscore', 'minappliedjobfitscore', 'maxappliedjobfitscore', 'minmatchingjobfitscore', 'maxmatchingjobfitscore', 'matchingfitscore', 'matchingfitscoremin', 'matchingfitscoremax', 'minexperienceyears', 'maxexperienceyears'].includes(key.toLowerCase())) {
      const numValue = parseInt(value, 10);
      if (Number.isNaN(numValue) || numValue < 0) {
        return {
          isValid: false,
          error: `Invalid number for "${key}": "${value}"`,
          suggestions: ['Use a positive number (e.g., 80 for 80%)']
        };
      }
    }

    if (['applicationdatestart', 'applicationdateend'].includes(key.toLowerCase())) {
      const dateValue = new Date(value);
      if (Number.isNaN(dateValue.getTime())) {
        return {
          isValid: false,
          error: `Invalid date for "${key}": "${value}"`,
          suggestions: ['Use format YYYY-MM-DD (e.g., 2024-01-15)']
        };
      }
    }
  }

  return { isValid: true };
}

export function parseAdvancedQuery(query: string): Partial<ApplicantFilterValues> {
  const filters: Partial<ApplicantFilterValues> = {};
  const decodedQuery = decodeURIComponent(query);
  const parts = decodedQuery.split(' ').filter(part => part.includes(':'));

  parts.forEach(part => {
    const colonIndex = part.indexOf(':');
    if (colonIndex === -1) return;

    const key = part.substring(0, colonIndex);
    const value = part.substring(colonIndex + 1);
    if (!key || !value) return;

    switch (key.toLowerCase()) {
      case 'name':
        filters.name = value;
        break;
      case 'email':
        filters.email = value;
        break;
      case 'phone':
        filters.phone = value;
        break;
      case 'skills':
        filters.skills = value;
        break;
      case 'location':
        filters.location = value;
        break;
      case 'minexperienceyears': {
        const minExpYears = parseInt(value, 10);
        if (!Number.isNaN(minExpYears)) filters.minExperienceYears = minExpYears;
        break;
      }
      case 'maxexperienceyears': {
        const maxExpYears = parseInt(value, 10);
        if (!Number.isNaN(maxExpYears)) filters.maxExperienceYears = maxExpYears;
        break;
      }
      case 'positionid':
        filters.selectedPositionIds = value.split(',');
        break;
      case 'status':
        filters.selectedStatuses = value.split(',').map(s => s.trim());
        break;
      case 'recruiterid':
        filters.selectedRecruiterIds = value.split(',');
        break;
      case 'selectedsourceids':
        filters.selectedSourceIds = value.split(',');
        break;
      case 'minfitscore':
      case 'minappliedjobfitscore': {
        const minScore = parseInt(value, 10);
        if (!Number.isNaN(minScore)) filters.minAppliedJobFitScore = minScore / 100;
        break;
      }
      case 'maxfitscore':
      case 'maxappliedjobfitscore': {
        const maxScore = parseInt(value, 10);
        if (!Number.isNaN(maxScore)) filters.maxAppliedJobFitScore = maxScore / 100;
        break;
      }
      case 'matchingfitscore': {
        const matchingScore = parseInt(value, 10);
        if (!Number.isNaN(matchingScore)) {
          filters.minMatchingJobFitScore = matchingScore / 100;
          filters.maxMatchingJobFitScore = 1;
        }
        break;
      }
      case 'matchingfitscoremin':
      case 'minmatchingjobfitscore': {
        const matchingMinScore = parseInt(value, 10);
        if (!Number.isNaN(matchingMinScore)) filters.minMatchingJobFitScore = matchingMinScore / 100;
        break;
      }
      case 'matchingfitscoremax':
      case 'maxmatchingjobfitscore': {
        const matchingMaxScore = parseInt(value, 10);
        if (!Number.isNaN(matchingMaxScore)) filters.maxMatchingJobFitScore = matchingMaxScore / 100;
        break;
      }
      case 'applicationdatestart':
        parseDateFilter(value, date => {
          filters.applicationDateStart = date;
        });
        break;
      case 'applicationdateend':
        parseDateFilter(value, date => {
          filters.applicationDateEnd = date;
        });
        break;
      case 'locationoperator':
        filters.locationOperator = value as ApplicantFilterValues['locationOperator'];
        break;
    }
  });

  return filters;
}

function parseDateFilter(value: string, assign: (date: Date) => void) {
  try {
    const decodedValue = decodeURIComponent(value);
    const date = parseISO(decodedValue);
    if (!Number.isNaN(date.getTime())) {
      assign(date);
    }
  } catch (error) {
    console.error('Error parsing advanced query date:', value, error);
  }
}
