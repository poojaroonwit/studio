import React, { useState, useEffect } from 'react';
import { MessageSquare, UploadCloud, FileCheck } from 'lucide-react';
import CandidateCommentsSection from './CandidateCommentsSection';
import CandidateResumesSection from './CandidateResumesSection';
import CandidateEvaluationSection from './CandidateEvaluationSection';
import type { Candidate } from '@/lib/types';

interface CandidateSidebarProps {
  candidate: Candidate;
  comments: any[];
  resumes: any[];
  isEditing: boolean;
  onRefresh: () => void;
  calculateTotalExperienceDuration: (experience: any[]) => string;
  calculateAverageDurationPerCompany: (experience: any[]) => string;
}

export const CandidateSidebar: React.FC<CandidateSidebarProps> = ({
  candidate,
  comments,
  resumes,
  isEditing,
  onRefresh,
  calculateTotalExperienceDuration,
  calculateAverageDurationPerCompany
}) => {
  const [activeTab, setActiveTab] = useState<string>('comments');
  const [hasEvaluationLink, setHasEvaluationLink] = useState<boolean>(false);
  const [checkingLink, setCheckingLink] = useState(true);

  useEffect(() => {
    checkEvaluationLink();
  }, [candidate.id]);

  const checkEvaluationLink = async () => {
    try {
      setCheckingLink(true);
      const response = await fetch(`/api/v1/candidates/${candidate.id}/evaluation-link`, {
        credentials: 'include'
      });
      setHasEvaluationLink(response.ok);
    } catch (error) {
      setHasEvaluationLink(false);
    } finally {
      setCheckingLink(false);
    }
  };

  const getExperience = (candidate: Candidate) => {
    if (!candidate) return [];
    if (Array.isArray(candidate.experienceData) && candidate.experienceData.length > 0) {
      return candidate.experienceData;
    }
    const parsedData = candidate.parsedData;
    if (parsedData && typeof parsedData === 'object') {
      if ('candidate_info' in parsedData && parsedData.candidate_info && typeof parsedData.candidate_info === 'object') {
        const experience = (parsedData.candidate_info as any).experience;
        if (Array.isArray(experience) && experience.length > 0) {
          return experience;
        }
      }
      if ('experience' in parsedData) {
        const experience = (parsedData as any).experience;
        if (Array.isArray(experience) && experience.length > 0) {
          return experience;
        }
      }
    }
    return [];
  };

  const tabCount = hasEvaluationLink ? 3 : 2;
  const gridCols = tabCount === 3 ? 'grid-cols-3' : 'grid-cols-2';

  return (
    <div className="h-full flex flex-col min-h-0 pointer-events-auto">
      {/* Tab Navigation */}
      <div className={`grid w-full ${gridCols} bg-background border-b border-border flex-shrink-0`}>
        <div 
          className={`text-xs flex items-center justify-center gap-2 px-3 py-4 cursor-pointer transition-colors ${activeTab === 'comments' ? 'border-b-2 border-primary bg-background' : 'bg-transparent'}`}
          onClick={() => setActiveTab('comments')}
        >
          <MessageSquare className="w-4 h-4" />
          Comments & Activity
          {(() => {
            const commentCount = comments.length;
            return commentCount > 0 ? ` (${commentCount})` : '';
          })()}
        </div>
        <div 
          className={`text-xs flex items-center justify-center gap-2 px-3 py-4 cursor-pointer transition-colors ${activeTab === 'attachments' ? 'border-b-2 border-primary bg-background' : 'bg-transparent'}`}
          onClick={() => setActiveTab('attachments')}
        >
          <UploadCloud className="w-4 h-4" />
          Attachments
          {(() => {
            const attachmentCount = resumes.length;
            return attachmentCount > 0 ? ` (${attachmentCount})` : '';
          })()}
        </div>
        {hasEvaluationLink && (
          <div 
            className={`text-xs flex items-center justify-center gap-2 px-3 py-4 cursor-pointer transition-colors ${activeTab === 'evaluate' ? 'border-b-2 border-primary bg-background' : 'bg-transparent'}`}
            onClick={() => setActiveTab('evaluate')}
          >
            <FileCheck className="w-4 h-4" />
            Evaluate
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 pointer-events-auto">
        {activeTab === 'comments' && (
          <CandidateCommentsSection 
            candidateId={candidate.id} 
            comments={comments} 
            isEditing={isEditing} 
            onCommentsChange={onRefresh} 
          />
        )}
        
        {activeTab === 'attachments' && (
          <CandidateResumesSection 
            candidateId={candidate.id} 
            resumes={resumes} 
            isEditing={isEditing} 
            onResumesChange={onRefresh} 
          />
        )}

        {activeTab === 'evaluate' && hasEvaluationLink && (
          <CandidateEvaluationSection 
            candidateId={candidate.id}
          />
        )}
      </div>
    </div>
  );
};
