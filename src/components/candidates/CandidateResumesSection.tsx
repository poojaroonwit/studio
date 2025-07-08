import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface Resume {
  id: string;
  fileName: string;
  url: string;
  updatedAt: string;
  isPrimary: boolean;
}

interface Candidate {
  id: string;
  resumes: Resume[];
}

interface CandidateResumesSectionProps {
  candidate: Candidate;
  isEditing: boolean;
  onResumesChange: () => void;
}

const CandidateResumesSection: React.FC<CandidateResumesSectionProps> = ({ candidate, isEditing, onResumesChange }) => {
  const [sortDesc, setSortDesc] = useState(true);

  const sortedResumes = [...(candidate.resumes || [])].sort((a, b) => {
    const dateA = new Date(a.updatedAt).getTime();
    const dateB = new Date(b.updatedAt).getTime();
    return sortDesc ? dateB - dateA : dateA - dateB;
  });

  const handleSetPrimary = async (resumeId: string) => {
    await fetch(`/api/candidates/${candidate.id}/resumes/${resumeId}/primary`, { method: 'PUT' });
    onResumesChange();
  };

  const handleDelete = async (resumeId: string) => {
    await fetch(`/api/candidates/${candidate.id}/resumes/${resumeId}`, { method: 'DELETE' });
    onResumesChange();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold">Resumes</span>
        <Button size="sm" variant="outline" onClick={() => setSortDesc(!sortDesc)}>
          Sort by Date {sortDesc ? '↓' : '↑'}
        </Button>
      </div>
      <div className="space-y-3">
        {sortedResumes.length === 0 && <div className="text-muted-foreground text-sm">No resumes uploaded.</div>}
        {sortedResumes.map(resume => (
          <div key={resume.id} className="border rounded p-3 bg-muted/30 flex items-center justify-between gap-4">
            <div>
              <a href={resume.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">{resume.fileName}</a>
              <div className="text-xs text-muted-foreground">Updated: {new Date(resume.updatedAt).toLocaleString()}</div>
              {resume.isPrimary && <Badge variant="default" className="ml-2">Primary</Badge>}
            </div>
            {isEditing && (
              <div className="flex gap-2">
                {!resume.isPrimary && <Button size="sm" onClick={() => handleSetPrimary(resume.id)}>Set Primary</Button>}
                <Button size="sm" variant="destructive" onClick={() => handleDelete(resume.id)}>Delete</Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CandidateResumesSection; 