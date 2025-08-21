"use client";
import React, { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ServerCrash, Save, X, Briefcase, User, Phone, GraduationCap, Clock, Target, MessageSquare, UploadCloud } from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as z from 'zod';

// Import extracted components
import { CandidateHeader } from './CandidateHeader';
import { CandidatePipelineSection } from './CandidatePipelineSection';
import { CandidateTabsContent } from './CandidateTabsContent';
import { CandidateSidebar } from './CandidateSidebar';

// Import modals
import UploadResumeModal from './UploadResumeModal';
import { ManageTransitionsModal } from './ManageTransitionsModal';
import { EditPositionModal } from '@/components/positions/EditPositionModal';
import JobMatchModal from './JobMatchModal';
import ReprocessModal from './ReprocessModal';
import { GenerativeAIModal } from './GenerativeAIModal';
import CandidateAttachmentUploadModal from './CandidateAttachmentUploadModal';

// Import hooks
import { useCandidateDetail } from './hooks/useCandidateDetail';

// Import utilities
import { formatScoreWithGrade } from "@/lib/scoreUtils";
import { updateCandidateStatusWithNotes } from '@/lib/candidateTransitionUtils';
import { Badge } from '@/components/ui/badge';

// Types
import type { Candidate, Position } from '@/lib/types';

interface FullCandidateDetailProps {
  candidateId: string;
  isModal?: boolean;
  onClose?: () => void;
  comments: any[];
  resumes: any[];
  onRefresh: () => void;
}

const uuidSchema = z.string().uuid();

const FullCandidateDetail: React.FC<FullCandidateDetailProps> = ({ 
  candidateId, 
  isModal = false, 
  onClose, 
  comments, 
  resumes, 
  onRefresh 
}) => {
  const { data: session } = useSession();
  const [avatarInputRef] = useState<React.RefObject<HTMLInputElement>>(React.createRef());
  
  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isTransitionsModalOpen, setIsTransitionsModalOpen] = useState(false);
  const [isJobMatchModalOpen, setIsJobMatchModalOpen] = useState(false);
  const [isEditPositionModalOpen, setIsEditPositionModalOpen] = useState(false);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [isReprocessModalOpen, setIsReprocessModalOpen] = useState(false);
  const [isGenerativeAIModalOpen, setIsGenerativeAIModalOpen] = useState(false);
  
  // Selection states
  const [preselectedStage, setPreselectedStage] = useState<string | null>(null);
  const [selectedJobMatch, setSelectedJobMatch] = useState<any>(null);
  const [selectedPositionForEdit, setSelectedPositionForEdit] = useState<Position | null>(null);
  const [activeTab, setActiveTab] = useState<string>('jobs');

  // Use custom hook for candidate detail logic
  const {
    candidate,
    loading,
    error,
    isEditing,
    allDbPositions,
    availableRecruiters,
    availableSources,
    availableStages,
    transitionHistory,
    candidateJobMatches,
    isAssigningRecruiter,
    isAssigningSource,
    avatarUploading,
    avatarError,
    copiedJobApplied,
    copiedJobMatchIndex,
    isSaving,
    control,
    handleSubmit,
    reset,
    register,
    errors,
    watch,
    setValue,
    setIsEditing,
    setCopiedJobApplied,
    setCopiedJobMatchIndex,
    setIsSaving,
    setIsAssigningRecruiter,
    setIsAssigningSource,
    calculateTotalExperienceDuration,
    calculateAverageDurationPerCompany,
    handleAssignRecruiter,
    handleAssignSource,
    handleAvatarUpload,
    fetchTransitionHistory,
    // Form field arrays
    educationFields,
    appendEducation,
    removeEducation,
    experienceFields,
    appendExperience,
    removeExperience,
    skillsFields,
    appendSkill,
    removeSkill,
    jobSuitableFields,
    appendJobSuitable,
    removeJobSuitable,
    jobMatchesFields,
    appendJobMatch,
    removeJobMatch,
  } = useCandidateDetail(candidateId);

  // Validate candidateId
  const isValidCandidateId = candidateId && uuidSchema.safeParse(candidateId).success;

  // Early return for invalid candidate ID
  if (!isValidCandidateId) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center p-6">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Invalid Candidate ID</h2>
        <p className="text-muted-foreground mb-6">The candidate ID is not valid.</p>
        {onClose && <Button onClick={onClose}>Close</Button>}
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
          <p className="text-muted-foreground">Loading candidate details...</p>
          <p className="text-xs text-muted-foreground">This may take a few moments</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !candidate) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4 text-center">
          <ServerCrash className="h-12 w-12 text-destructive" />
          <div>
            <h3 className="text-lg font-medium text-foreground">Failed to load candidate</h3>
            <p className="text-muted-foreground text-sm mb-4">{error || 'Candidate not found'}</p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              size="sm"
            >
              <Loader2 className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Event handlers
  const openManageTransitionsModal = (stageName?: string) => {
    setPreselectedStage(stageName || candidate?.status || availableStages[0]?.name || null);
    setIsTransitionsModalOpen(true);
  };

  const handleJobMatchClick = (jobMatch: any) => {
        const position = Array.isArray(allDbPositions)
      ? (allDbPositions.find(p => p.id === jobMatch.jobId) || allDbPositions.find(p => p.title === jobMatch.jobTitle))
          : null;
        
    const jobMatchData = {
      jobId: position ? position.id : jobMatch.jobId,
      jobTitle: position ? position.title : jobMatch.jobTitle,
      fitScore: jobMatch.fitScore,
      matchReasons: jobMatch.matchReasons || [],
          position: position
            ? {
                id: position.id,
                title: position.title,
                description: position.description,
                department: position.department,
                requirements: (position as any).requirements,
                isOpen: position.isOpen,
              }
        : undefined,
    };
    setSelectedJobMatch(jobMatchData);
    setIsJobMatchModalOpen(true);
  };

  const copyJobAppliedToClipboard = async () => {
    if (!candidate?.positionId) return;
    
    const position = Array.isArray(allDbPositions) ? allDbPositions.find(p => p.id === candidate.positionId) : null;
    const jobTitle = position?.title || 'Unknown Position';
    const fitScore = candidate.fitScore !== null && candidate.fitScore !== undefined 
      ? `${Math.round(candidate.fitScore * 100)}%`
      : 'Not set';
    const justification = candidate.assignmentJustification
            ? (Array.isArray(candidate.assignmentJustification)
          ? candidate.assignmentJustification.filter(Boolean)
                : typeof candidate.assignmentJustification === 'string'
            ? candidate.assignmentJustification.split('\n').map((sentence: string) => sentence.trim()).filter(Boolean)
                  : [])
            : [];
    
    const textToCopy = `Job Applied: ${jobTitle}\nFit Score: ${fitScore}\nJustification:\n• ${justification.join('\n• ')}`;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedJobApplied(true);
      setTimeout(() => setCopiedJobApplied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const copyJobMatchToClipboard = async (match: any, index: number) => {
    const position = Array.isArray(allDbPositions) ? 
                   (allDbPositions.find(p => p.id === match.jobId) || 
                    allDbPositions.find(p => p.title === match.jobTitle)) : null;
    
    const displayTitle = position?.title || match.jobTitle || match.positionTitle || 'Unknown Position';
    const fitScore = match.fitScore !== undefined && match.fitScore !== null 
      ? `${formatScoreWithGrade(match.fitScore)}`
      : 'Not set';
    const matchReasons = match.matchReasons && Array.isArray(match.matchReasons) && match.matchReasons.length > 0 
      ? match.matchReasons.join('\n• ')
      : 'No match reasons provided';
    
    const textToCopy = `Job Match: ${displayTitle}\nFit Score: ${fitScore}\nMatch Reasons:\n• ${matchReasons}`;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedJobMatchIndex(index);
      setTimeout(() => setCopiedJobMatchIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleSaveDetails = async (data: any) => {
    if (!candidate) return;

    if (Object.keys(errors).length > 0) {
      toast.error('Please fix form validation errors before saving');
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    try {
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Failed to update candidate: ${errorData.message || res.statusText}`);
      }

      const updatedCandidate = await res.json();
      setIsEditing(false);
      toast.success('Candidate updated successfully');
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error updating candidate:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update candidate');
    } finally {
      setIsSaving(false);
    }
  };

  // Job applied data
  const appliedJobId = candidate?.positionId;
  const appliedFitScore = candidate?.fitScore;
  const appliedJustification = candidate?.assignmentJustification
    ? (Array.isArray(candidate.assignmentJustification)
        ? candidate.assignmentJustification.filter(Boolean)
        : typeof candidate.assignmentJustification === 'string'
          ? candidate.assignmentJustification.split('\n').map((sentence: string) => sentence.trim()).filter(Boolean)
          : [])
    : [];

  let appliedJobBadge = null;
  if (appliedJobId) {
    const appliedPosition = allDbPositions.find(p => p.id === appliedJobId);
    const hasFitScore = appliedFitScore !== null && appliedFitScore !== undefined;
    const hasGrade = appliedPosition?.gradeId && appliedPosition?.grade;
    
    if (hasFitScore || hasGrade) {
      appliedJobBadge = (
        <div className="flex items-center gap-2">
          {hasFitScore && (
            <div className="text-sm font-medium text-primary">
              {formatScoreWithGrade(appliedFitScore)}
            </div>
          )}
          {hasGrade && appliedPosition?.grade && (
            <Badge
              variant="outline"
              className="text-xs"
              style={{
                borderColor: appliedPosition.grade.color || '#3B82F6',
                color: appliedPosition.grade.color || '#3B82F6'
              }}
            >
              {appliedPosition.grade.name}
            </Badge>
          )}
        </div>
      );
    }
  }

  return (
    <div className={isModal ? "h-full overflow-y-auto" : "h-full"}>
      {/* Header */}
      <CandidateHeader
        candidate={candidate}
        isModal={isModal}
        onClose={onClose}
        isEditing={isEditing}
        availableStages={availableStages}
        availableRecruiters={availableRecruiters}
        availableSources={availableSources}
        isAssigningRecruiter={isAssigningRecruiter}
        isAssigningSource={isAssigningSource}
        onAssignRecruiter={handleAssignRecruiter}
        onAssignSource={handleAssignSource}
        onResetAssigning={() => setIsAssigningRecruiter(false)}
        onResetSourceAssigning={() => setIsAssigningSource(false)}
        onEditClick={() => setIsEditing(true)}
        onManageTransitions={openManageTransitionsModal}
        onReprocess={() => setIsReprocessModalOpen(true)}
        onGenerativeAI={() => setIsGenerativeAIModalOpen(true)}
        avatarInputRef={avatarInputRef}
        avatarUploading={avatarUploading}
        avatarError={avatarError}
        onAvatarUpload={handleAvatarUpload}
      />
      
                  {/* Pipeline Section - Above main content and sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-10 border-t bg-card">
        <div className="lg:col-span-10">
          <CandidatePipelineSection
            candidate={candidate}
            availableStages={availableStages}
                  transitionHistory={transitionHistory}
                  onStageClick={openManageTransitionsModal}
                  onNoteEdit={async (transitionId, newNote) => {
                    await fetch(`/api/transitions/${transitionId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ notes: newNote }),
                      credentials: 'include',
                    });
                    // Refresh transition history
                    const res = await fetch(`/api/transitions?candidateId=${candidateId}`, { credentials: 'include' });
                    if (res.ok) {
                      const data = await res.json();
                // Update transition history in the hook
                    }
                  }}
                  candidateId={candidateId}
                />
              </div>
                      </div>
                      
      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-10 border-t bg-card">
        {/* Main Content with Tabs */}
        <div className="lg:col-span-7 border-r border-border bg-muted/50">
          <div className="w-full h-full">
            <div className="grid w-full grid-cols-5 bg-background border-b border-border">
              <div 
                className={`text-xs flex items-center justify-center gap-2 px-3 py-4 cursor-pointer transition-colors ${activeTab === 'jobs' ? 'border-b-2 border-primary bg-background' : 'bg-transparent'}`}
                onClick={() => setActiveTab('jobs')}
              >
                <Briefcase className="w-4 h-4" />
                Job Applied & Matched
                {(() => {
                  const jobMatches = candidateJobMatches || [];
                  const matchCount = jobMatches.length;
                  return matchCount > 0 ? ` (${matchCount})` : '';
                })()}
                            </div>
              <div 
                className={`text-xs flex items-center justify-center gap-2 px-3 py-4 cursor-pointer transition-colors ${activeTab === 'candidate-info' ? 'border-b-2 border-primary bg-background' : 'bg-transparent'}`}
                onClick={() => setActiveTab('candidate-info')}
              >
                <User className="w-4 h-4" />
                Candidate Info
                        </div>
              <div 
                className={`text-xs flex items-center justify-center gap-2 px-3 py-4 cursor-pointer transition-colors ${activeTab === 'education' ? 'border-b-2 border-primary bg-background' : 'bg-transparent'}`}
                onClick={() => setActiveTab('education')}
              >
                <GraduationCap className="w-4 h-4" />
                Education
                {(() => {
                  const education = (candidate.parsedData as any)?.education || [];
                  const educationCount = education.length;
                  return educationCount > 0 ? ` (${educationCount})` : '';
                })()}
                           </div>
              <div 
                className={`text-xs flex items-center gap-2 px-3 py-4 cursor-pointer transition-colors ${activeTab === 'experience' ? 'border-b-2 border-primary bg-background' : 'bg-transparent'}`}
                onClick={() => setActiveTab('experience')}
              >
                <Clock className="w-4 h-4" />
                Experience
                 {(() => {
                  const experience = (candidate.parsedData as any)?.experience || [];
                  const totalDuration = (() => {
                    let totalMonths = 0;
                    experience.forEach((exp: any) => {
                      let startDate: Date | null = null;
                      let endDate: Date | null = null;
                      
                      if (exp.startYear && exp.startMonth) {
                        startDate = new Date(exp.startYear, exp.startMonth - 1);
                      }
                      
                      if (exp.endYear && exp.endMonth) {
                        endDate = new Date(exp.endYear, exp.endMonth - 1);
                      } else if (exp.isCurrent) {
                        endDate = new Date();
                      }
                      
                      if (startDate && endDate) {
                        const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
                        if (months > 0) {
                          totalMonths += months;
                        }
                      }
                    });
                    
                    const years = Math.floor(totalMonths / 12);
                    const months = totalMonths % 12;
                    
                    if (years === 0 && months === 0) return '';
                    
                    const parts = [];
                    if (years > 0) parts.push(`${years}Y`);
                    if (months > 0) parts.push(`${months}M`);
                    return parts.join(' ');
                  })();
           return totalDuration ? ` (${totalDuration})` : '';
         })()}
                  </div>
              <div 
                className={`text-xs flex items-center gap-2 px-3 py-4 cursor-pointer transition-colors ${activeTab === 'job-suitability' ? 'border-b-2 border-primary bg-background' : 'bg-transparent'}`}
                onClick={() => setActiveTab('job-suitability')}
              >
                <Target className="w-4 h-4" />
                Job Suitability
                 {(() => {
                  const jobSuitable = (candidate.parsedData as any)?.job_suitable || [];
                  // Filter out empty entries (objects with no content)
                  const filteredJobSuitable = jobSuitable.filter((job: any) => {
                    const hasContent = job.suitable_career || job.suitable_job_position || 
                                     job.suitable_job_level || job.suitable_salary_bath_month ||
                                     job.career || job.position || job.level || job.salary ||
                                     job.job_career || job.job_position || job.job_level || job.job_salary ||
                                     job.title || job.role || job.expected_salary || job.salary_expectation;
                    return hasContent;
                  });
                  const suitabilityCount = filteredJobSuitable.length;
                  return suitabilityCount > 0 ? ` (${suitabilityCount})` : '';
                 })()}
             </div>
             
             </div>
             
            <div className="p-8 h-full">
              <CandidateTabsContent
                activeTab={activeTab}
                candidate={candidate}
                allDbPositions={allDbPositions}
                 isEditing={isEditing} 
                candidateJobMatches={candidateJobMatches}
                onJobMatchClick={handleJobMatchClick}
                onCopyJobMatch={copyJobMatchToClipboard}
                copiedJobMatchIndex={copiedJobMatchIndex}
                onCopyJobApplied={copyJobAppliedToClipboard}
                copiedJobApplied={copiedJobApplied}
                appliedJobId={appliedJobId}
                appliedFitScore={appliedFitScore}
                appliedJustification={appliedJustification}
                appliedJobBadge={appliedJobBadge}
                // Pass form control and field arrays to tabs for editing
                                control={control}
                register={register}
                errors={errors}
                watch={watch}
                setValue={setValue}
                educationFields={educationFields}
                appendEducation={appendEducation}
                removeEducation={removeEducation}
                experienceFields={experienceFields}
                appendExperience={appendExperience}
                removeExperience={removeExperience}
                skillsFields={skillsFields}
                appendSkill={appendSkill}
                removeSkill={removeSkill}
                jobSuitableFields={jobSuitableFields}
                appendJobSuitable={appendJobSuitable}
                removeJobSuitable={removeJobSuitable}
                jobMatchesFields={jobMatchesFields}
                appendJobMatch={appendJobMatch}
                removeJobMatch={removeJobMatch}
                // Pass duration calculation functions
                calculateTotalExperienceDuration={calculateTotalExperienceDuration}
                // Pass comments and resumes for new tabs
                comments={comments}
                   resumes={resumes} 
                onRefresh={onRefresh}
                 />
                 </div>
                 </div>
               </div>
        
        {/* Sidebar */}
        <CandidateSidebar
          candidate={candidate}
          comments={comments} 
                   resumes={resumes} 
                   isEditing={isEditing} 
          onRefresh={onRefresh}
          calculateTotalExperienceDuration={calculateTotalExperienceDuration}
          calculateAverageDurationPerCompany={calculateAverageDurationPerCompany}
                 />
      </div>
 
      {/* Modals */}
      <UploadResumeModal
        isOpen={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        candidate={candidate}
        onUploadSuccess={(updatedCandidate) => {
          setIsUploadModalOpen(false);
        }}
      />
 
      <ManageTransitionsModal
        isOpen={isTransitionsModalOpen}
        onOpenChange={(open) => {
          setIsTransitionsModalOpen(open);
          if (!open) setPreselectedStage(null);
        }}
        candidate={candidate}
        availableStages={availableStages}
        onUpdateCandidate={async (candidateId: string, status: string, notes?: string, suppressToast?: boolean) => {
          try {
            await updateCandidateStatusWithNotes(candidateId, status, notes, suppressToast);
            if (!suppressToast) {
              toast.success(`Candidate status updated to "${status}".`);
            }
          } catch (error: any) {
            console.error('Error updating candidate status:', error);
            if (!suppressToast) {
              toast.error(error?.message || 'Failed to update status.');
            }
          }
        }}
        onRefreshCandidateData={async (candidateId: string) => {
          // Refresh candidate data
          await onRefresh();
          await fetchTransitionHistory();
        }}
        preselectedStage={preselectedStage}
        comments={comments}
        onCommentsChange={() => {
          onRefresh();
        }}
      />
 
      <JobMatchModal
        isOpen={isJobMatchModalOpen}
        onClose={() => setIsJobMatchModalOpen(false)}
        jobMatch={selectedJobMatch}
      />
 
      <EditPositionModal
        isOpen={isEditPositionModalOpen}
        onOpenChange={setIsEditPositionModalOpen}
        position={selectedPositionForEdit}
        onEditPosition={async () => {
          setIsEditPositionModalOpen(false);
        }}
      />

      <CandidateAttachmentUploadModal
        candidateId={candidateId}
        open={isAttachmentModalOpen}
        onClose={() => setIsAttachmentModalOpen(false)}
        onUploadSuccess={onRefresh}
      />

      {candidate && (
        <ReprocessModal
          isOpen={isReprocessModalOpen}
          onOpenChange={setIsReprocessModalOpen}
          candidateId={candidate.id}
          candidateName={candidate.name || 'Unknown Candidate'}
          candidatePositionId={candidate.positionId}
          attachments={resumes}
          positions={allDbPositions}
        />
      )}

      {candidate && (
        <GenerativeAIModal
          isOpen={isGenerativeAIModalOpen}
          onOpenChange={setIsGenerativeAIModalOpen}
          candidateId={candidate.id}
          candidateName={candidate.name || 'Unknown Candidate'}
          onRefresh={onRefresh}
        />
      )}
 
      {/* Floating Save/Cancel buttons when editing */}
      {isEditing && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
          {Object.keys(errors).length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive max-w-md">
              <div className="font-semibold mb-2">Form validation errors:</div>
              <ul className="space-y-1">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field}>
                    <strong>{field}:</strong> {(error as any)?.message || 'Invalid field'}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="flex gap-2">
          <Button
            onClick={handleSubmit(handleSaveDetails)}
            disabled={isSaving}
            className="shadow-lg"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
              </>
            )}
          </Button>
          <Button
            variant="outline"
              onClick={() => setIsEditing(false)}
            className="shadow-lg"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          </div>
        </div>
      )}
    </div>
  );
 };
 
 export default FullCandidateDetail;