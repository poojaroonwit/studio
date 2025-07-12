import React from 'react';
import type { ExperienceEntry } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Briefcase } from 'lucide-react';

interface CandidateExperienceProps {
  experience: ExperienceEntry[];
  // Add any handlers or state needed for editing, saving, etc.
}

const CandidateExperience: React.FC<CandidateExperienceProps> = ({ experience }) => {
  // Sort experience by period (most recent first)
  const sortedExperience = [...experience].sort((a, b) => {
    // Extract years from period strings (assuming format like "Jan 2022 - Present" or "2018-2022")
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
        <CardTitle>Work Experience</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedExperience && sortedExperience.length > 0 ? (
          <div className="relative">
            {sortedExperience.map((entry, idx) => (
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
                  <div className="flex-1 min-w-0 pb-12">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="font-semibold text-foreground mb-1">
                        {entry.position || 'Position not specified'}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {entry.company || 'Company not specified'}
                      </p>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-3">
                        {entry.period && (
                          <span>Period: {entry.period}</span>
                        )}
                        {entry.duration && (
                          <span>Duration: {entry.duration}</span>
                        )}
                        {entry.postition_level && (
                          <span>Level: {entry.postition_level}</span>
                        )}
                        {entry.is_current_position && (
                          <span className="text-primary font-medium">Current Position</span>
                        )}
                      </div>
                      {entry.description && (
                        <p className="text-sm text-muted-foreground">
                          {entry.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Connecting line (except for the last item) */}
                {idx < sortedExperience.length - 1 && (
                  <div className="absolute left-4 top-8 w-0.5 h-12 bg-border" />
                )}
                
                {/* Line for the last item that extends to bottom */}
                {idx === sortedExperience.length - 1 && (
                  <div className="absolute left-4 top-8 w-0.5 h-12 bg-border" />
                )}
              </div>
            ))}
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