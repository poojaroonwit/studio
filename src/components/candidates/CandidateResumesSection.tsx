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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const res = await fetch(`/api/candidates/${candidate.id}/resumes`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      onResumesChange();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold">Resumes</span>
        <Button size="sm" variant="outline" onClick={() => setSortDesc(!sortDesc)}>
          Sort by Date {sortDesc ? '↓' : '↑'}
        </Button>
      </div>
      {isEditing && (
        <div className="mb-2 flex items-center gap-2">
          <input
            type="file"
            accept="application/pdf,.doc,.docx,.rtf"
            id="resume-upload"
            style={{ display: 'none' }}
            onChange={handleUpload}
            disabled={uploading}
          />
          <label htmlFor="resume-upload">
            <Button asChild size="sm" disabled={uploading}>
              <span>{uploading ? 'Uploading...' : 'Upload Resume'}</span>
            </Button>
          </label>
          {uploadError && <span className="text-destructive text-xs ml-2">{uploadError}</span>}
        </div>
      )}
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