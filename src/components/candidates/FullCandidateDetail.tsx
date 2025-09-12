"use client";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ServerCrash, Save, X, Briefcase, User, Phone, GraduationCap, Clock, Target, MessageSquare, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as z from 'zod';

// Import extracted components
import { CandidateHeader } from './CandidateHeader';
import { CandidatePipelineSection } from './CandidatePipelineSection';
import { CandidateTabsContent } from './CandidateTabsContent';
import { CandidateSidebar } from './CandidateSidebar';

// Import modals
import UploadResumeModal from './UploadResumeModal';
import { ManageTransitionsModal } from './ManageTransitionsModal';

import JobMatchModal from './JobMatchModal';
import ReprocessModal from './ReprocessModal';
import { GenerativeAIModal } from './GenerativeAIModal';
import CandidateAttachmentUploadModal from './CandidateAttachmentUploadModal';
import { HeadcountWarningModal } from './HeadcountWarningModal';
import { DeleteCandidateModal } from './DeleteCandidateModal';
import { PositionDetailDrawer } from '@/components/positions/PositionDetailDrawer';
import { useJobMatchFeature } from '@/hooks/useJobMatchFeature';

// Import hooks
import { useCandidateDetail } from './hooks/useCandidateDetail';

// Import utilities
import { formatScoreWithGrade } from "@/lib/scoreUtils";
import { updateCandidateStatusWithNotes } from '@/lib/candidateTransitionUtils';
import { Badge } from '@/components/ui/badge';
import { ScoreBadge } from '@/components/ui/score-color';

// Types
import type { Candidate, Position } from '@/lib/types';
import type { TransitionRecord } from '@/lib/types';

interface FullCandidateDetailProps {
  candidateId: string;
  isModal?: boolean;
  onClose?: () => void;
  comments: any[];
  resumes: any[];
  onRefresh: () => void;
}

const FullCandidateDetail: React.FC<FullCandidateDetailProps> = ({ 
  candidateId, 
  isModal = false, 
  onClose, 
  comments, 
  resumes, 
  onRefresh 
}) => {
  const { data: session } = useSession();
  const { isJobMatchEnabled } = useJobMatchFeature();
  const { success: toastSuccess, error: toastError } = useToast();
  const [avatarInputRef] = useState<React.RefObject<HTMLInputElement>>(React.createRef());
  

  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isTransitionsModalOpen, setIsTransitionsModalOpen] = useState(false);
  const [isJobMatchModalOpen, setIsJobMatchModalOpen] = useState(false);

  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [isReprocessModalOpen, setIsReprocessModalOpen] = useState(false);
  const [isGenerativeAIModalOpen, setIsGenerativeAIModalOpen] = useState(false);
  const [isHeadcountWarningModalOpen, setIsHeadcountWarningModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Position drawer state
  const [isPositionDrawerOpen, setIsPositionDrawerOpen] = useState(false);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  
  // Headcount warning state
  const [headcountWarningData, setHeadcountWarningData] = useState<{
    candidateName: string;
    positionTitle?: string;
    errorMessage: string;
  } | null>(null);

  // Add a ref to track when the modal was opened to prevent premature closing
  const headcountModalOpenTimeRef = useRef<number | null>(null);
  
  // Add state to track when headcount warning was shown to prevent immediate reopening of transitions modal
  const [headcountWarningShownTime, setHeadcountWarningShownTime] = useState<number | null>(null);

  // Function to open position drawer
  const handleOpenPositionDrawer = (positionId: string) => {
    setSelectedPositionId(positionId);
    setIsPositionDrawerOpen(true);
  };

  // Function to handle candidate deletion
  const handleDeleteCandidate = async () => {
    if (!candidate?.id) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete candidate');
      }

      toastSuccess('Candidate deleted successfully');
      
      // Close the modal/detail view
      if (onClose) {
        onClose();
      } else {
        // If not in modal, redirect to candidates list
        window.location.href = '/candidates';
      }
    } catch (error: any) {
      console.error('Error deleting candidate:', error);
      toastError(error.message || 'Failed to delete candidate');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  // Function to handle candidate pin toggle
  const handleTogglePin = async () => {
    if (!candidate?.id) return;
    
    try {
      const response = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPinned: !candidate.isPinned }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update candidate pin status');
      }

      const updatedCandidate = await response.json();
      
      // Update the candidate state with the new pin status
      setCandidate(prev => prev ? { ...prev, isPinned: updatedCandidate.isPinned } : prev);
      
      toastSuccess(updatedCandidate.isPinned ? 'Candidate pinned successfully' : 'Candidate unpinned successfully');
      
      // Refresh the parent component
      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      console.error('Error toggling candidate pin status:', error);
      toastError(error.message || 'Failed to update candidate pin status');
    }
  };

  // Wrap setHeadcountWarningData to add debugging
  const setHeadcountWarningDataWithDebug = (data: typeof headcountWarningData) => {
    console.log('FullCandidateDetail - setHeadcountWarningData called with:', data);
    if (data === null) {
      console.trace('FullCandidateDetail - headcountWarningData being set to null');
    }
    setHeadcountWarningData(data);
  };
  



  // Prevent modal from being closed unexpectedly
  const closeHeadcountWarningModal = useCallback(() => {
    console.log('FullCandidateDetail - closeHeadcountWarningModal called - user explicitly closing modal');
    
    // Check if modal was opened recently (within last 2 seconds) to prevent premature closing
    if (headcountModalOpenTimeRef.current) {
      const timeSinceOpen = Date.now() - headcountModalOpenTimeRef.current;
      if (timeSinceOpen < 2000) {
        console.log('FullCandidateDetail - Modal opened too recently, preventing close. Time since open:', timeSinceOpen, 'ms');
        return;
      }
    }
    
    setIsHeadcountWarningModalOpen(false);
    setHeadcountWarningDataWithDebug(null);
    headcountModalOpenTimeRef.current = null;
    setHeadcountWarningShownTime(null);
  }, []);

  
  // Auto-clear headcount warning timestamp after 5 seconds to allow transitions modal to be reopened
  useEffect(() => {
    if (headcountWarningShownTime) {
      const timer = setTimeout(() => {
        setHeadcountWarningShownTime(null);
        console.log('FullCandidateDetail - Auto-clearing headcount warning timestamp');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [headcountWarningShownTime]);
  
  // Selection states
  const [preselectedStage, setPreselectedStage] = useState<string | null>(null);
  const [selectedJobMatch, setSelectedJobMatch] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<string>('jobs');

  // Refs for timeout cleanup
  const copiedJobAppliedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const copiedJobMatchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use custom hook for candidate detail logic
  const {
    candidate,
    loading,
    error,
    isEditing,
    allDbPositions,
    availableRecruiter,
    availableSources,
    availableStages,
    transitionHistory,
    candidateJobMatches,
    isAssigningRecruiter,
    isAssigningSource,
    avatarUploading,
    avatarError,
    avatarForceRefresh,
    copiedJobApplied,
    copiedJobMatchIndex,
    isSaving,
    realtimeConnected,
    formPopulated,
    
    // Form
    control,
    handleSubmit,
    reset,
    register,
    errors,
    watch,
    setValue,
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
    setCandidate,
    setTransitionHistory,
    // Actions
    setIsEditing,
    setCopiedJobApplied,
    setCopiedJobMatchIndex,
    setIsSaving,
    setIsAssigningRecruiter,
    setIsAssigningSource,
    // Functions
    calculateTotalExperienceDuration,
    calculateAverageDurationPerCompany,
    handleAssignRecruiter,
    handleAssignSource,
    handleAvatarUpload,
    handleEnterEditMode,
    customFieldsRefreshTrigger,
    refreshCustomFields,
  } = useCandidateDetail(candidateId);



  // UUID validation removed

  // Cleanup timeouts on component unmount
  React.useEffect(() => {
    return () => {
      if (copiedJobAppliedTimeoutRef.current) {
        clearTimeout(copiedJobAppliedTimeoutRef.current);
      }
      if (copiedJobMatchTimeoutRef.current) {
        clearTimeout(copiedJobMatchTimeoutRef.current);
      }
    };
  }, []);

  // UUID validation removed - proceed with any candidate ID

  // Memoized callback for comments change
  const handleCommentsChange = useCallback(() => {
    onRefresh();
  }, [onRefresh]);


  // Handle custom field changes
  const handleCustomFieldChange = useCallback((fieldCode: string, value: any) => {
    setCandidate(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        customFields: {
          ...prev.customFields,
          [fieldCode]: value
        }
      };
    });
  }, [setCandidate]);

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
    // Prevent opening transitions modal if headcount warning was recently shown (within last 3 seconds)
    if (headcountWarningShownTime && (Date.now() - headcountWarningShownTime) < 3000) {
      console.log('FullCandidateDetail - Preventing transitions modal from opening - headcount warning was recently shown');
      toastError('Please resolve the headcount constraint before changing candidate status.');
      return;
    }
    
    setPreselectedStage(stageName || candidate?.status || availableStages[0]?.name || null);
    setIsTransitionsModalOpen(true);
  };

  const handleJobMatchClick = (jobMatch: any) => {
    if (!isJobMatchEnabled) return;
    
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
    const fitScore = formatScoreWithGrade(candidate.fitScore);
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
      
      // Clear any existing timeout
      if (copiedJobAppliedTimeoutRef.current) {
        clearTimeout(copiedJobAppliedTimeoutRef.current);
      }
      
      copiedJobAppliedTimeoutRef.current = setTimeout(() => setCopiedJobApplied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const copyJobMatchToClipboard = async (match: any, index: number) => {
    if (!isJobMatchEnabled) return;
    
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
      
      // Clear any existing timeout
      if (copiedJobMatchTimeoutRef.current) {
        clearTimeout(copiedJobMatchTimeoutRef.current);
      }
      
      copiedJobMatchTimeoutRef.current = setTimeout(() => setCopiedJobMatchIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleSaveDetails = async (data: any) => {
    if (!candidate) return;

    // Validation check removed

    if (isSaving) return;
    setIsSaving(true);

    try {
      // Compose full name from title + first name + last name
      const personalInfo = data.parsedData?.personal_info || {};
      const title = personalInfo.title_honorific || '';
      const firstName = personalInfo.firstname || '';
      const lastName = personalInfo.lastname || '';
      
      const fullName = [title, firstName, lastName].filter(Boolean).join(' ').trim();
      
      // Add the composed name and custom fields to the data being sent
      const dataWithName = {
        ...data,
        name: fullName || candidate.name, // Fallback to existing name if composition is empty
        customFields: candidate.customFields || {} // Include updated custom fields from state
      };

      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataWithName),
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Failed to update candidate: ${errorData.message || res.statusText}`);
      }

      const updatedCandidate = await res.json();
      setIsEditing(false);
      toastSuccess('Candidate updated successfully');
      
      // Refresh custom fields to show latest data
      refreshCustomFields();
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error updating candidate:', err);
      toastError(err instanceof Error ? err.message : 'Failed to update candidate');
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
    const hasGrade = appliedPosition?.gradeId && appliedPosition?.grade;
    
    if (hasGrade) {
      appliedJobBadge = (
        <div className="flex items-center gap-2">
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
    <div className={isModal ? "h-full flex flex-col bg-background pointer-events-auto" : "h-full flex flex-col bg-background"}>
      {/* Header */}
      <div className="relative">
        <CandidateHeader
          candidate={candidate}
          isModal={isModal}
          onClose={onClose}
          isEditing={isEditing}
          availableStages={availableStages}
          availableRecruiter={availableRecruiter}
          availableSources={availableSources}
          isAssigningRecruiter={isAssigningRecruiter}
          isAssigningSource={isAssigningSource}
          onAssignRecruiter={handleAssignRecruiter}
          onAssignSource={handleAssignSource}
          onResetAssigning={() => setIsAssigningRecruiter(false)}
          onResetSourceAssigning={() => setIsAssigningSource(false)}
          onEditClick={handleEnterEditMode}
          onManageTransitions={openManageTransitionsModal}
          onReprocess={() => setIsReprocessModalOpen(true)}
          onGenerativeAI={() => setIsGenerativeAIModalOpen(true)}
          onDelete={() => setIsDeleteModalOpen(true)}
          onTogglePin={handleTogglePin}
          avatarInputRef={avatarInputRef}
          avatarUploading={avatarUploading}
          avatarError={avatarError}
          avatarForceRefresh={avatarForceRefresh}
          onAvatarUpload={handleAvatarUpload}
          realtimeConnected={realtimeConnected}
        />
      </div>
      
      {/* Pipeline Section - Above main content and sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-10 border-t bg-card flex-shrink-0">
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
      <div className="grid grid-cols-1 lg:grid-cols-12 border-t bg-card flex-1 min-h-0">
        {/* Main Content with Tabs */}
        <div className="lg:col-span-9 border-r border-border bg-muted/50 flex flex-col min-h-0 pointer-events-auto">
          <div className="w-full h-full flex flex-col min-h-0 pointer-events-auto">
            <div className="flex w-full bg-background border-b border-border flex-shrink-0">
              <div 
                className={`text-xs flex items-center justify-center gap-2 px-4 py-4 cursor-pointer transition-colors flex-1 ${activeTab === 'jobs' ? 'border-b-2 border-primary bg-background' : 'bg-transparent'}`}
                onClick={() => setActiveTab('jobs')}
              >
                <Briefcase className="w-4 h-4" />
                {isJobMatchEnabled ? 'Job Applied & Matched' : 'Job Applied'}
                {(() => {
                  if (!isJobMatchEnabled) return '';
                  const jobMatches = candidateJobMatches || [];
                  const matchCount = jobMatches.length;
                  return matchCount > 0 ? ` (${matchCount})` : '';
                })()}
              </div>
              <div 
                className={`text-xs flex items-center justify-center gap-2 px-4 py-4 cursor-pointer transition-colors flex-1 ${activeTab === 'candidate-info' ? 'border-b-2 border-primary bg-background' : 'bg-transparent'}`}
                onClick={() => setActiveTab('candidate-info')}
              >
                <User className="w-4 h-4" />
                Candidate Info
              </div>
              <div 
                className={`text-xs flex items-center justify-center gap-2 px-4 py-4 cursor-pointer transition-colors flex-1 ${activeTab === 'education' ? 'border-b-2 border-primary bg-background' : 'bg-transparent'}`}
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
                className={`text-xs flex items-center justify-center gap-2 px-4 py-4 cursor-pointer transition-colors flex-1 ${activeTab === 'experience' ? 'border-b-2 border-primary bg-background' : 'bg-transparent'}`}
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
              
            </div>
             
            <div className="p-8 flex-1 overflow-y-auto bg-background h-full pointer-events-auto">
              <form id="candidate-edit-form" onSubmit={handleSubmit(handleSaveDetails)} className="h-full">
                <CandidateTabsContent
                  key={candidate?.id}
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
                  onOpenPositionDrawer={handleOpenPositionDrawer}
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
                onCustomFieldChange={handleCustomFieldChange}
                customFieldsRefreshTrigger={customFieldsRefreshTrigger}
                />
              </form>
            </div>
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="lg:col-span-3 flex flex-col min-h-0 pointer-events-auto">
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
        onUpdateCandidate={async (candidateId: string, status: string, notes?: string, suppressToast?: boolean): Promise<boolean | undefined> => {
          console.log('FullCandidateDetail - onUpdateCandidate called with:', { candidateId, status, notes, suppressToast });
          // Store original state for potential reversion
          const originalCandidate = candidate;
          const originalTransitionHistory = transitionHistory;
          
          try {
            // Check if this is a status change to "Hired" or similar hiring status
            // First, find the stage name for the given status ID
            const selectedStage = availableStages.find(stage => stage.id === status);
            const stageName = selectedStage?.name || status;
            
            const isHiringStatus = stageName.toLowerCase().includes('hired') || 
                                 stageName.toLowerCase().includes('hiring') ||
                                 stageName.toLowerCase().includes('employed');
            
            console.log('FullCandidateDetail - Status update requested:', {
              status,
              stageName,
              isHiringStatus,
              candidatePositionId: candidate?.positionId,
              candidateName: candidate?.name
            });
            
            if (isHiringStatus && candidate?.positionId) {
              console.log('FullCandidateDetail - Attempting to update to hiring status, checking headcount availability first');
              
              // Check headcount availability before proceeding
              try {
                const response = await fetch(`/api/headcount/validate-hiring?candidateId=${candidateId}&positionId=${candidate.positionId}`);
                const validationResult = await response.json();
                
                console.log('FullCandidateDetail - Headcount validation result:', validationResult);
                
                if (!validationResult.canHire) {
                  console.log('FullCandidateDetail - Headcount not available, showing warning modal and blocking status change');
                  
                  // Close the ManageTransitionsModal when showing headcount warning
                  setIsTransitionsModalOpen(false);
                  setPreselectedStage(null);
                  
                  // Get position title for the warning
                  const positionTitle = allDbPositions.find(p => p.id === candidate.positionId)?.title;
                  
                  // Set warning data and show modal
                  setHeadcountWarningDataWithDebug({
                    candidateName: candidate?.name || 'Unknown Candidate',
                    positionTitle,
                    errorMessage: validationResult.message
                  });
                  
                  // Open modal to block the status change
                  headcountModalOpenTimeRef.current = Date.now();
                  setHeadcountWarningShownTime(Date.now());
                  setIsHeadcountWarningModalOpen(true);
                  
                  // IMPORTANT: Status change was blocked
                  console.log('FullCandidateDetail - Status change blocked');
                  console.log('FullCandidateDetail - Status update blocked, modal should be open');
                  return;
                } else {
                  console.log('FullCandidateDetail - Headcount available, proceeding with status update');
                }
              } catch (validationError) {
                console.error('Error validating headcount availability:', validationError);
                // If validation fails, show error and don't proceed
                toastError('Failed to validate headcount availability. Please try again.');
                return false;
              }
            }
            
            // If we reach here, either it's not a hiring status or headcount is available
            // Proceed with normal status update logic
            
            // Apply optimistic update immediately
            if (candidate) {
              // Optimistically update the candidate status
              setCandidate(prev => prev ? {
                ...prev,
                statusId: status,
                updatedAt: new Date().toISOString()
              } : null);

              // Optimistically add a new transition record
              const optimisticTransition: TransitionRecord = {
                id: `temp-${Date.now()}`,
                candidateId: candidateId,
                stage: status,
                notes: notes || undefined,
                actingUserId: session?.user?.id || null,
                date: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };

              // Update transition history optimistically
              setTransitionHistory(prev => [optimisticTransition, ...(Array.isArray(prev) ? prev : [])]);
            }

            // Make the actual API call
            await updateCandidateStatusWithNotes(candidateId, status, notes, suppressToast, {
              success: toastSuccess,
              error: toastError
            });
            
            // Successfully completed - return true to indicate transaction passed
            console.log('FullCandidateDetail - onUpdateCandidate completed successfully');
            return true;
                     } catch (error: any) {
             console.error('FullCandidateDetail - Error updating candidate status:', error);
             
             // For any errors, revert optimistic updates
             if (originalCandidate) {
               // Revert candidate status to original
               setCandidate(originalCandidate);

               // Revert transition history to original
               setTransitionHistory(originalTransitionHistory);
             }
             
             // Show error toast
             if (!suppressToast) {
               toastError(error?.message || 'Failed to update status.');
             } else {
               // If suppressToast is true, re-throw the error so the calling component can handle it
               throw error;
             }
             
             // Error handled - return false to indicate transaction failed
             return false;
           }
        }}
        onRefreshCandidateData={async (candidateId: string) => {
          // Refresh candidate data
          await onRefresh();
        }}
        preselectedStage={preselectedStage}
        comments={comments}
        onCommentsChange={handleCommentsChange}
        
      />
 
      {isJobMatchEnabled && (
        <JobMatchModal
          isOpen={isJobMatchModalOpen}
          onClose={() => setIsJobMatchModalOpen(false)}
          jobMatch={selectedJobMatch}
        />
      )}
 


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
          candidateSourceId={candidate.sourceId}
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

      {candidate && headcountWarningData && (
        <HeadcountWarningModal
          isOpen={isHeadcountWarningModalOpen}
          onClose={closeHeadcountWarningModal}
          candidateName={headcountWarningData.candidateName}
          positionTitle={headcountWarningData.positionTitle}
          errorMessage={headcountWarningData.errorMessage}
        />
      )}

      {/* Delete Candidate Modal */}
      <DeleteCandidateModal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        candidate={candidate}
        onConfirm={handleDeleteCandidate}
        isDeleting={isDeleting}
      />

      {/* Position Detail Drawer */}
      <PositionDetailDrawer
        isOpen={isPositionDrawerOpen}
        onOpenChange={(open) => {
          setIsPositionDrawerOpen(open);
          if (!open) {
            setSelectedPositionId(null);
          }
        }}
        positionId={selectedPositionId}
      />
 
      {/* Floating Save/Cancel buttons when editing */}
      {isEditing && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-2 candidate-edit-buttons" style={{ zIndex: 2000 }}>
          {/* Validation error display removed */}
          
          <div className="flex gap-2">
          <Button
            type="submit"
            form="candidate-edit-form"
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