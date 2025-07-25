import React from 'react';
import type { EducationEntry } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';
import { differenceInMonths } from 'date-fns';

function formatTimelinePeriod(startMonth, startYear, endMonth, endYear, isCurrent) {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  let left = '', right = '';
  if (startMonth && startYear) {
    left = `<strong>${months[parseInt(startMonth, 10) - 1] || startMonth} ${startYear}</strong>`;
  } else if (startYear) {
    left = `<strong>${startYear}</strong>`;
  }
  if (isCurrent) {
    right = `<strong>Present</strong>`;
  } else if (endMonth && endYear) {
    right = `<strong>${months[parseInt(endMonth, 10) - 1] || endMonth} ${endYear}</strong>`;
  } else if (endYear) {
    right = `<strong>${endYear}</strong>`;
  }
  return `${left} - ${right}`;
}

function formatTimelineDuration(startMonth, startYear, endMonth, endYear, isCurrent) {
  if (!startYear) return '';
  const start = startMonth ? new Date(startYear, parseInt(startMonth, 10) - 1) : new Date(startYear, 0);
  let end;
  if (isCurrent) {
    end = new Date();
  } else if (endYear) {
    end = endMonth ? new Date(endYear, parseInt(endMonth, 10) - 1) : new Date(endYear, 0);
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

interface CandidateEducationProps {
  education: EducationEntry[];
  // Add any handlers or state needed for editing, saving, etc.
}

const CandidateEducation: React.FC<CandidateEducationProps> = ({ education }) => {
  // Sort education by period (most recent first)
  const sortedEducation = [...education].sort((a, b) => {
    // Extract years from period strings (assuming format like "2018-2022" or "2020-2024")
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
        <CardTitle>Education History</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedEducation && sortedEducation.length > 0 ? (
          <div className="relative">
            {/* Continuous vertical line that connects all nodes */}
            <div className="absolute left-4 top-8 w-0.5 bg-border" style={{ height: `${(sortedEducation.length - 1) * 80 + 48}px` }} />
            
            {sortedEducation.map((entry, idx) => {
              const isCurrent = !entry.endYear && !entry.endMonth;
              const periodDisplay = formatTimelinePeriod(entry.startMonth, entry.startYear, entry.endMonth, entry.endYear, isCurrent);
              const duration = formatTimelineDuration(entry.startMonth, entry.startYear, entry.endMonth, entry.endYear, isCurrent);
              return (
                <div key={idx} className="relative">
                  {/* Timeline item */}
                  <div className="flex items-start space-x-4">
                    {/* Cycle node */}
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-12">
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground mb-2">
                          {entry.major && entry.field ? `${entry.major} - ${entry.field}` : entry.major || entry.field || 'Field of study not specified'}
                        </p>
                        <h4 className="font-semibold text-foreground mb-1">
                          {entry.university || 'University not specified'}
                          {entry.campus && ` (${entry.campus})`}
                        </h4>
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          {periodDisplay && (
                            <span dangerouslySetInnerHTML={{ __html: periodDisplay }} />
                          )}
                          {duration && (
                            <span>{duration}</span>
                          )}
                          {entry.GPA && (
                            <span>GPA: {entry.GPA}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-muted-foreground text-center py-8">
            No education history available.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CandidateEducation; 