import React from 'react';
import type { Candidate } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCandidateNameWithLang } from '@/lib/candidateUtils';

interface AssociatedCandidatesProps {
  candidates: Candidate[];
}

const AssociatedCandidates: React.FC<AssociatedCandidatesProps> = ({ candidates }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Associated Candidates</CardTitle>
      </CardHeader>
      <CardContent>
        {candidates && candidates.length > 0 ? (
          <ul className="space-y-2">
            {candidates.map((candidate, idx) => {
              const nameInfo = formatCandidateNameWithLang(candidate);
              return (
                <li key={candidate.id || idx} className="flex items-center justify-between">
                  <span 
                    className={nameInfo.fontClass}
                    lang={nameInfo.lang}
                  >
                    {nameInfo.name}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    (Fit Score: {candidate.fitScore || 0}%)
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div>No candidates associated with this position.</div>
        )}
      </CardContent>
    </Card>
  );
};

export default AssociatedCandidates; 