import React from 'react';
import type { ExperienceEntry } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Briefcase, Building } from 'lucide-react';
import { differenceInMonths } from 'date-fns';
import { sanitizeHtml } from '@/lib/utils';

function formatTimelinePeriod(
  startMonth: number | null,
  startYear: number | null,
  endMonth: number | null,
  endYear: number | null,
  isCurrent: boolean
) {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  let left = '', right = '';
  if (startMonth && startYear) {
    left = `<strong>${months[(startMonth ?? 1) - 1] || startMonth} ${startYear}</strong>`;
  } else if (startYear) {
    left = `<strong>${startYear}</strong>`;
  }
  if (isCurrent) {
    right = `<strong>Present</strong>`;
  } else if (endMonth && endYear) {
    right = `<strong>${months[(endMonth ?? 1) - 1] || endMonth} ${endYear}</strong>`;
  } else if (endYear) {
    right = `<strong>${endYear}</strong>`;
  }
  return `${left} - ${right}`;
}

function formatTimelineDuration(
  startMonth: number | null,
  startYear: number | null,
  endMonth: number | null,
  endYear: number | null,
  isCurrent: boolean
) {
  if (!startYear) return '';
  const start = startMonth ? new Date(startYear, (startMonth ?? 1) - 1) : new Date(startYear, 0);
  let end;
  if (isCurrent) {
    end = new Date();
  } else if (endYear) {
    end = endMonth ? new Date(endYear, (endMonth ?? 1) - 1) : new Date(endYear, 0);
  } else {
    end = new Date();
  }
  const months = differenceInMonths(end, start);
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  let parts = [];
  if (years > 0) parts.push(`${years} Year${years > 1 ? 's' : ''}`);
  if (remMonths > 0) parts.push(`${remMonths} Month${remMonths > 1 ? 's' : ''}`);
  return parts.length ? `(${parts.join(', ')})` : '';
}

interface CandidateExperienceProps {
  experience: ExperienceEntry[];
  // Add any handlers or state needed for editing, saving, etc.
}

const CandidateExperience: React.FC<CandidateExperienceProps> = ({ experience }) => {
  // Function to calculate total experience duration
  const calculateTotalExperienceDuration = (experienceArray: ExperienceEntry[]) => {
    let totalMonths = 0;
    
    const safeExperienceArray = Array.isArray(experienceArray) ? experienceArray : [];
    safeExperienceArray.forEach((exp: ExperienceEntry) => {
      let startDate: Date | null = null;
      let endDate: Date | null = null;
      
      // Get start date
      if (exp.startYear && exp.startMonth) {
        startDate = new Date(exp.startYear, exp.startMonth - 1);
      } else if (exp.period) {
        // Extract start date from period string
        const startMatch = exp.period.match(/([A-Za-z]+)\s+(\d{4})/);
        if (startMatch) {
          const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          const monthIndex = months.indexOf(startMatch[1].toLowerCase());
          if (monthIndex !== -1) {
            startDate = new Date(parseInt(startMatch[2]), monthIndex);
          }
        }
      }
      
      // Get end date
      // Check for valid end date (not future dates like 9999)
      const hasValidEndDate = exp.endYear && exp.endMonth && 
        exp.endYear <= new Date().getFullYear() + 1 && 
        exp.endYear >= 1900;
      
      if (hasValidEndDate && exp.endYear && exp.endMonth) {
        endDate = new Date(exp.endYear, exp.endMonth - 1);
      } else if (exp.is_current_position === true || exp.isCurrent === true || 
                 (exp.period && (exp.period.includes('Present') || exp.period.includes('present'))) ||
                 !exp.endMonth || !exp.endYear) {
        endDate = new Date(); // Current date for current positions
      } else if (exp.period) {
        // Extract end date from period string
        const endMatch = exp.period.match(/([A-Za-z]+)\s+(\d{4})(?:\s*-\s*|$)/);
        if (endMatch) {
          const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          const monthIndex = months.indexOf(endMatch[1].toLowerCase());
          if (monthIndex !== -1) {
            endDate = new Date(parseInt(endMatch[2]), monthIndex);
          }
        }
      }
      
      // Calculate duration for this experience
      if (startDate && endDate) {
        const months = differenceInMonths(endDate, startDate);
        if (months > 0) {
          totalMonths += months;
        }
      }
    });
    
    // Convert total months to years and months
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    
    if (years === 0 && months === 0) {
      return '';
    }
    
    const parts = [];
    if (years > 0) {
      parts.push(`${years} year${years > 1 ? 's' : ''}`);
    }
    if (months > 0) {
      parts.push(`${months} month${months > 1 ? 's' : ''}`);
    }
    
    return parts.join(' ');
  };

  // Helper function to calculate dynamic duration for current positions
  const calculateDuration = (entry: ExperienceEntry) => {
    if (entry.duration) return entry.duration; // Use existing duration if available
    
    // Try to calculate from period string or structured fields
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    
    if (entry.startYear && entry.startMonth) {
      startDate = new Date(entry.startYear, entry.startMonth - 1);
    } else if (entry.period) {
      // Extract start date from period string (e.g., "Jan 2022 - Present" or "Jan 2022 - Dec 2023")
      const startMatch = entry.period.match(/([A-Za-z]+)\s+(\d{4})/);
      if (startMatch) {
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthIndex = months.indexOf(startMatch[1].toLowerCase());
        if (monthIndex !== -1) {
          startDate = new Date(parseInt(startMatch[2]), monthIndex);
        }
      }
    }
    
    // Check for valid end date (not future dates like 9999)
    const hasValidEndDate = entry.endYear && entry.endMonth && 
      entry.endYear <= new Date().getFullYear() + 1 && 
      entry.endYear >= 1900;
    
    if (hasValidEndDate && entry.endYear && entry.endMonth) {
      endDate = new Date(entry.endYear, entry.endMonth - 1);
    } else if (entry.is_current_position === true || entry.isCurrent === true ||
               (entry.period && (entry.period.includes('Present') || entry.period.includes('present'))) ||
               !entry.endMonth || !entry.endYear) {
      endDate = new Date(); // Current date for current positions
    } else if (entry.period) {
      // Extract end date from period string
      const endMatch = entry.period.match(/([A-Za-z]+)\s+(\d{4})(?:\s*-\s*|$)/);
      if (endMatch) {
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthIndex = months.indexOf(endMatch[1].toLowerCase());
        if (monthIndex !== -1) {
          endDate = new Date(parseInt(endMatch[2]), monthIndex);
        }
      }
    }
    
    if (startDate && endDate) {
      const months = differenceInMonths(endDate, startDate);
      const years = Math.floor(months / 12);
      const remMonths = months % 12;
      return [
        years > 0 ? `${years} year${years > 1 ? 's' : ''}` : '',
        remMonths > 0 ? `${remMonths} month${remMonths > 1 ? 's' : ''}` : ''
      ].filter(Boolean).join(' ');
    }
    
    return entry.duration || '';
  };

  // Sort experience: current jobs first, then by timeline (latest first)
  const sortedExperience = [...experience].sort((a, b) => {
    // First, prioritize current positions
    const aIsCurrent = a.is_current_position === true || a.isCurrent === true || 
                      (a.period && (a.period.includes('Present') || a.period.includes('present'))) ||
                      !a.endMonth || !a.endYear;
    const bIsCurrent = b.is_current_position === true || b.isCurrent === true || 
                      (b.period && (b.period.includes('Present') || b.period.includes('present'))) ||
                      !b.endMonth || !b.endYear;
    
    if (aIsCurrent && !bIsCurrent) return -1;
    if (!aIsCurrent && bIsCurrent) return 1;
    
    // If both are current or both are not current, sort by start date (latest first)
    const getYear = (period: string) => {
      const yearMatch = period.match(/(\d{4})/);
      return yearMatch ? parseInt(yearMatch[1]) : 0;
    };
    
    const yearA = a.period ? getYear(a.period) : 0;
    const yearB = b.period ? getYear(b.period) : 0;
    
    return yearB - yearA; // Most recent first
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Work Experience
          {(() => {
            const totalDuration = calculateTotalExperienceDuration(experience);
            return totalDuration ? ` (${totalDuration})` : '';
          })()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedExperience && sortedExperience.length > 0 ? (
          <div className="relative">
            {sortedExperience.map((entry, idx) => {
              const isCurrent = entry.is_current_position === true || entry.isCurrent === true || (!entry.endMonth && !entry.endYear);
              const periodDisplay = formatTimelinePeriod(
                entry.startMonth ?? null,
                entry.startYear ?? null,
                entry.endMonth ?? null,
                entry.endYear ?? null,
                isCurrent
              );
              const duration = formatTimelineDuration(
                entry.startMonth ?? null,
                entry.startYear ?? null,
                entry.endMonth ?? null,
                entry.endYear ?? null,
                isCurrent
              );
              return (
                <div key={idx} className="relative">
                  {/* Timeline item */}
                  <div className="flex items-start space-x-4">
                    {/* Cycle node */}
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Briefcase className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-6">
                      <div className="bg-muted/50 rounded-lg p-4">
                        {/* Position and Level */}
                        <div className="mb-2">
                          <span className="text-primary font-semibold">
                            {entry.position || 'Position not specified'}
                          </span>
                          {entry.positionLevel && entry.positionLevel !== 'undefined' && entry.positionLevel !== undefined && (
                            <span className="text-foreground font-semibold">
                              {' '}({entry.positionLevel})
                            </span>
                          )}
                        </div>
                        
                        {/* Company with Building Icon */}
                        {entry.company && (
                          <div className="mb-3 flex items-center gap-2">
                            {/* <span className="text-foreground">at</span> */}
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span className="text-foreground">
                              {entry.company}
                            </span>
                          </div>
                        )}
                        
                        {/* Period and Duration */}
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground mb-3">
                          {periodDisplay && (
                            <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(periodDisplay) }} />
                          )}
                          {duration && (
                            <span>{duration}</span>
                          )}
                        </div>
                        
                        {/* Description */}
                        {entry.description && (
                          <div className="mt-3">
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Description:</h4>
                            <p className="text-sm text-foreground whitespace-pre-wrap bg-card p-3 rounded border">
                              {entry.description}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Connecting line (except for the last item) */}
                  {idx < sortedExperience.length - 1 && (
                    <div className="absolute left-4 top-8 w-0.5 h-6 bg-border" />
                  )}
                  
                  {/* Line for the last item that extends to bottom */}
                  {idx === sortedExperience.length - 1 && (
                    <div className="absolute left-4 top-8 w-0.5 h-6 bg-border" />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-muted-foreground text-center py-8">
            No work experience available.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CandidateExperience; 