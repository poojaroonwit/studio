import React from 'react';
import type { EducationEntry } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';

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
            
            {sortedEducation.map((entry, idx) => (
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
                        {entry.major && entry.field ? `${entry.major} - ${entry.field}` : 
                         entry.major || entry.field || 'Field of study not specified'}
                      </p>
                      <h4 className="font-semibold text-foreground mb-1">
                        {entry.university || 'University not specified'}
                        {entry.campus && ` (${entry.campus})`}
                      </h4>
                    
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        {entry.period && (
                          <span><span className="font-bold text-foreground">{entry.period}</span></span>
                        )}
                        {entry.duration && (
                          <span>Duration: {entry.duration}</span>
                        )}
                        {entry.GPA && (
                          <span>GPA: {entry.GPA}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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