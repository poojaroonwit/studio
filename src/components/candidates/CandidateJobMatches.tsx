import React from 'react';
import type { AutomationJobMatch } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface CandidateJobMatchesProps {
  jobMatches: AutomationJobMatch[];
}

const CandidateJobMatches: React.FC<CandidateJobMatchesProps> = ({ jobMatches }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Matches</CardTitle>
      </CardHeader>
      <CardContent>
        {jobMatches && jobMatches.filter((match) => match.fitScore >= 70).length > 0 ? (
          <ul>
            {jobMatches.filter((match) => match.fitScore >= 70).map((match, idx) => (
              <li key={idx}>
                {match.jobTitle} (Fit Score: {match.fitScore}%)
              </li>
            ))}
          </ul>
        ) : (
          <div>No job matches with 70% or higher fit score found.</div>
        )}
      </CardContent>
    </Card>
  );
};

export default CandidateJobMatches; 