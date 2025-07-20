import React from 'react';
import type { Candidate } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCandidateNameWithLang } from '@/lib/candidateUtils';

interface CandidatePersonalInfoProps {
  candidate: Candidate;
}

const CandidatePersonalInfo: React.FC<CandidatePersonalInfoProps> = ({ candidate }) => {
  const nameInfo = formatCandidateNameWithLang(candidate);
  
  // Render personal info fields, edit form, etc.
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Display candidate personal info here */}
        <div>
          <span className="font-medium">Name: </span>
          <span 
            className={nameInfo.fontClass}
            lang={nameInfo.lang}
          >
            {nameInfo.name}
          </span>
        </div>
        {/* Add more fields as needed */}
      </CardContent>
    </Card>
  );
};

export default CandidatePersonalInfo; 