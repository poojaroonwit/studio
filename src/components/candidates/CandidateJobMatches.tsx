import React from 'react';
import type { AutomationJobMatch } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface CandidateJobMatchesProps {
  jobMatches: AutomationJobMatch[];
}

const CandidateJobMatches: React.FC<CandidateJobMatchesProps> = ({ jobMatches }) => {
  const normalizedJobMatches = jobMatches?.map(jm => ({
    ...jm,
    fitScore: jm.fitScore,
    matchReasons: jm.matchReasons,
  }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Matches</CardTitle>
      </CardHeader>
      <CardContent>
        {normalizedJobMatches && normalizedJobMatches.length > 0 ? (
          <ul>
            {normalizedJobMatches.map((match, idx) => (
              <li key={idx}>
                {match.jobTitle} (Fit Score: {match.fitScore}%)
              </li>
            ))}
          </ul>
        ) : (
          <div>No job matches found.</div>
        )}
      </CardContent>
    </Card>
  );
};

export default CandidateJobMatches; 