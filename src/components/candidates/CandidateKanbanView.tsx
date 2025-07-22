// src/components/candidates/CandidateKanbanView.tsx
"use client";

import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import type { Candidate, CandidateStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CandidateDetailModal from './CandidateDetailModal';
import FullCandidateDetail from './FullCandidateDetail';
import { Pencil, Trash2, MoveRight, Plus, Calendar, Target, User, Mail, Phone, Clock, TrendingUp, ChevronLeft, ChevronRight, Eye, Users, GraduationCap, Briefcase, HardDrive } from 'lucide-react';
import { formatScoreWithGrade, getScoreColor, getScoreBgColor } from "@/lib/scoreUtils";
import { formatCandidateName, formatCandidateNameWithLang } from "@/lib/candidateUtils";
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Helper function to extract parsed data properties (similar to FullCandidateDetail)
const getParsedDataProperty = (candidate: Candidate, propertyName: string) => {
  const parsedData = candidate.parsedData;
  if (!parsedData || typeof parsedData !== 'object') return undefined;
  
  // Check for new candidate_info structure
  if ('candidate_info' in parsedData && parsedData.candidate_info && typeof parsedData.candidate_info === 'object') {
    return (parsedData.candidate_info as any)[propertyName];
  }
  
  // Check for direct property
  if (propertyName in parsedData) {
    return (parsedData as any)[propertyName];
  }
  
  return undefined;
};

// Helper function to get education data
const getEducation = (candidate: Candidate) => {
  if (!candidate) return [];
  
  let educationArray: any[] = [];
  
  if (Array.isArray(candidate.educationData) && candidate.educationData.length > 0) {
    educationArray = candidate.educationData;
  } else {
    const parsedData = candidate.parsedData;
    if (parsedData && typeof parsedData === 'object') {
      // Check for new candidate_info structure
      if ('candidate_info' in parsedData && parsedData.candidate_info && typeof parsedData.candidate_info === 'object') {
        const education = (parsedData.candidate_info as any).education;
        if (Array.isArray(education) && education.length > 0) {
          educationArray = education;
        }
      }
      // Check for direct education property
      if ('education' in parsedData) {
        const education = (parsedData as any).education;
        if (Array.isArray(education) && education.length > 0) {
          educationArray = education;
        }
      }
    }
  }
  
  return educationArray;
};

// Helper function to get experience data
const getExperience = (candidate: Candidate) => {
  if (!candidate) return [];
  
  let experienceArray: any[] = [];
  
  if (Array.isArray(candidate.experienceData) && candidate.experienceData.length > 0) {
    experienceArray = candidate.experienceData;
  } else {
    const parsedData = candidate.parsedData;
    if (parsedData && typeof parsedData === 'object') {
      // Check for new candidate_info structure
      if ('candidate_info' in parsedData && parsedData.candidate_info && typeof parsedData.candidate_info === 'object') {
        const experience = (parsedData.candidate_info as any).experience;
        if (Array.isArray(experience) && experience.length > 0) {
          experienceArray = experience;
        }
      }
      // Check for direct experience property
      if ('experience' in parsedData) {
        const experience = (parsedData as any).experience;
        if (Array.isArray(experience) && experience.length > 0) {
          experienceArray = experience;
        }
      }
    }
  }
  
  return experienceArray;
};

// Helper function to get skills data
const getSkills = (candidate: Candidate) => {
  return getParsedDataProperty(candidate, 'skills') || [];
};

// Field label mapping (should match CustomizeBoardModal)
const fieldLabelMap: Record<string, string> = {
  status: 'Status',
  recruiterId: 'Recruiter',
  positionId: 'Position',
  fitScore: 'Fit Score',
  applicationDate: 'Application Date',
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
};
function getFieldLabel(key: string) {
  return fieldLabelMap[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

// Enhanced candidate card component
const EnhancedCandidateCard = ({ candidate, isDragged = false, onClick, onDragStart, onDragEnd, visibleFields = ['name', 'email', 'status', 'fitScore'] }: {
  candidate: Candidate;
  isDragged?: boolean;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  visibleFields?: string[];
}) => {

  
  // Validate candidate data
  if (!candidate || !candidate.id) {

    return (
      <Card className="p-4 border border-destructive/20 bg-destructive/5">
        <div className="text-center text-destructive text-sm">
          Invalid candidate data
        </div>
      </Card>
    );
  }
  
  const education = getEducation(candidate);
  const experience = getExperience(candidate);
  const skills = getSkills(candidate);
  const personalInfo = getParsedDataProperty(candidate, 'personal_info');
  const contactInfo = getParsedDataProperty(candidate, 'contact_info');

  return (
    <Card 
      className={cn(
        "w-full p-4 hover:shadow-md transition-all duration-200 bg-card border border-border flex flex-col gap-3 relative cursor-pointer",
        isDragged && "opacity-60 scale-95"
      )}
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {/* Name and position always shown */}
      {visibleFields.includes('name') && (() => {
        const nameInfo = formatCandidateNameWithLang(candidate);
        return (
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={candidate.avatarUrl || `https://placehold.co/40x40.png?text=${nameInfo.name?.charAt(0) || 'C'}`} alt={nameInfo.name} data-ai-hint="person avatar"/>
              <AvatarFallback className="bg-primary/10 text-primary">{nameInfo.name?.charAt(0)?.toUpperCase() || 'C'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p 
                className={`text-sm font-semibold text-foreground truncate ${nameInfo.fontClass}`} 
                title={nameInfo.name}
                lang={nameInfo.lang}
              >
                {nameInfo.name}
              </p>
              {visibleFields.includes('positionId') && (
                <p className="text-xs text-muted-foreground truncate mt-1" title={candidate.position?.title || 'N/A'}>
                  <Target className="w-3 h-3 inline mr-1" />
                  {candidate.position?.title || 'N/A'}
                </p>
              )}
            </div>
          </div>
        );
      })()}
      <div className="space-y-2">
        {visibleFields.includes('fitScore') && candidate.fitScore !== undefined && candidate.fitScore !== null && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{getFieldLabel('fitScore')}</span>
              <span className="font-medium text-foreground">
                {candidate.fitScore === 0 ? 'Not scored' : `${candidate.fitScore}%`}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={cn("h-2 rounded-full transition-all duration-300", getScoreBgColor(candidate.fitScore))}
                style={{ width: `${candidate.fitScore}%` }}
              ></div>
            </div>
          </div>
        )}
        {/* Contact Information */}
        {(visibleFields.includes('email') || visibleFields.includes('phone') || visibleFields.includes('applicationDate')) && (
          <div className="space-y-1">
            {visibleFields.includes('email') && candidate.email && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Mail className="w-3 h-3 mr-1" />
                <span className="truncate">{candidate.email}</span>
              </div>
            )}
            {visibleFields.includes('phone') && candidate.phone && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Phone className="w-3 h-3 mr-1" />
                <span className="truncate">{candidate.phone}</span>
              </div>
            )}
            {visibleFields.includes('applicationDate') && candidate.applicationDate && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Calendar className="w-3 h-3 mr-1" />
                Applied: {new Date(candidate.applicationDate).toLocaleDateString()}
              </div>
            )}
            {visibleFields.includes('recruiterId') && (
              <div className="flex items-center text-xs text-muted-foreground">
                <User className="w-3 h-3 mr-1" />
                <span>{candidate.recruiter?.name || candidate.recruiterId || 'Unassigned'}</span>
              </div>
            )}
          </div>
        )}
        {/* Education Summary */}
        {visibleFields.includes('education') && education && education.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center text-xs text-muted-foreground">
              <GraduationCap className="w-3 h-3 mr-1" />
              <span className="font-medium">{getFieldLabel('education')}:</span>
            </div>
            <div className="text-xs text-muted-foreground pl-4">
              {education.slice(0, 2).map((edu: any, idx: number) => (
                <div key={idx} className="truncate">
                  {edu.major || edu.field || 'Degree'} {edu.university && `at ${edu.university}`}
                </div>
              ))}
              {education.length > 2 && (
                <div className="text-xs text-muted-foreground/60">+{education.length - 2} more</div>
              )}
            </div>
          </div>
        )}
        {/* Experience Summary */}
        {visibleFields.includes('experience') && experience && experience.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center text-xs text-muted-foreground">
              <Briefcase className="w-3 h-3 mr-1" />
              <span className="font-medium">{getFieldLabel('experience')}:</span>
            </div>
            <div className="text-xs text-muted-foreground pl-4">
              {experience.slice(0, 2).map((exp: any, idx: number) => (
                <div key={idx} className="truncate">
                  {exp.position || 'Position'} {exp.company && `at ${exp.company}`}
                </div>
              ))}
              {experience.length > 2 && (
                <div className="text-xs text-muted-foreground/60">+{experience.length - 2} more</div>
              )}
            </div>
          </div>
        )}
        {/* Skills Summary */}
        {visibleFields.includes('skills') && skills && skills.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center text-xs text-muted-foreground">
              <HardDrive className="w-3 h-3 mr-1" />
              <span className="font-medium">{getFieldLabel('skills')}:</span>
            </div>
            <div className="flex flex-wrap gap-1 pl-4">
              {skills.slice(0, 3).map((skill: any, idx: number) => (
                <Badge key={idx} variant="outline" className="text-xs px-1 py-0">
                  {skill.skill_string || skill.segment_skill || 'Skill'}
                </Badge>
              ))}
              {skills.length > 3 && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  +{skills.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

interface CandidateKanbanViewProps {
  candidates: Candidate[];
  statuses: CandidateStatus[];
  onMoveCandidate?: (candidate: Candidate, newValue: string) => void;
  onCardClick?: (candidate: Candidate) => void;
  showAddButton?: boolean;
  rowField?: string;
  columnField?: string;
  visibleFields?: string[];
  visibleRowValues?: string[];
  visibleColumnValues?: string[];
}

export function CandidateKanbanView({
  candidates,
  statuses,
  onMoveCandidate,
  onCardClick,
  showAddButton = true,
  rowField = 'status',
  columnField = 'none',
  visibleFields = ['name', 'email', 'status', 'fitScore'],
  visibleRowValues = [],
  visibleColumnValues = [],
}: CandidateKanbanViewProps) {
  // If there are no candidates at all
  if (candidates.length === 0) {
    return (
      <div className="w-full min-h-[300px] bg-muted/30 rounded-lg p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-muted rounded-full flex items-center justify-center">
            <Plus className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-lg text-muted-foreground">No candidates found</p>
        </div>
      </div>
    );
  }

  // Delegate to FlexibleKanbanView with all customization props
  return (
    <FlexibleKanbanView
      candidates={candidates}
      statuses={statuses}
      onMoveCandidate={onMoveCandidate}
      onCardClick={onCardClick}
      showAddButton={showAddButton}
      rowField={rowField}
      columnField={columnField}
      visibleFields={visibleFields}
      visibleRowValues={visibleRowValues}
      visibleColumnValues={visibleColumnValues}
    />
  );
}

// Enhanced Row-based Kanban (stages as rows, candidates as draggable cards)
export function CandidateRowKanbanView({ 
  candidates, 
  statuses, 
  onMoveCandidate, 
  onCardClick, 
  rowField = 'status', 
  columnField = 'recruiterId', 
  visibleFields = ['name', 'email', 'status', 'fitScore'], 
  visibleRowValues = [], 
  visibleColumnValues = [] 
}: CandidateKanbanViewProps) {
  const [draggedCandidate, setDraggedCandidate] = useState<Candidate | null>(null);
  const [dragOverRowValue, setDragOverRowValue] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCandidateSummary, setSelectedCandidateSummary] = useState<Partial<Candidate> & { id: string; name: string } | null>(null);

  // Group candidates by row field value
  const candidatesByRowValue = useMemo(() => {
    const grouped: Record<string, Candidate[]> = {};
    
    // Initialize all visible row values with empty arrays
    visibleRowValues.forEach(rowValue => {
      grouped[rowValue] = [];
    });
    
    // Group candidates by their row field value
    candidates.forEach(candidate => {
      const rowValue = candidate[rowField as keyof Candidate] as string;
      if (rowValue && visibleRowValues.includes(rowValue)) {
        if (!grouped[rowValue]) {
          grouped[rowValue] = [];
        }
        grouped[rowValue].push(candidate);
      }
    });
    
    return grouped;
  }, [candidates, rowField, visibleRowValues]);

  // Only show rows in visibleRowValues (if provided)
  const filteredRowValues = visibleRowValues && visibleRowValues.length > 0
    ? visibleRowValues
    : statuses; // Fallback to statuses for backward compatibility

  // Drag and drop handlers
  const handleDragStart = (candidate: Candidate) => {
    setDraggedCandidate(candidate);
  };
  const handleDragEnd = () => {
    setDraggedCandidate(null);
    setDragOverRowValue(null);
  };
  const handleDragOver = (rowValue: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverRowValue(rowValue);
  };
  const handleDrop = (rowValue: string) => {
    if (draggedCandidate && draggedCandidate[rowField as keyof Candidate] !== rowValue) {
      // Create update object with the new row field value
      const updateData: any = {};
      updateData[rowField] = rowValue;
      onMoveCandidate?.(draggedCandidate, rowValue);
    }
    setDraggedCandidate(null);
    setDragOverRowValue(null);
  };

  const handleCardClick = (candidate: Candidate) => {
    if (onCardClick) {
      onCardClick(candidate);
    } else {
      // Validate parsedData to ensure it has the expected structure
      const validatedParsedData = candidate.parsedData && typeof candidate.parsedData === 'object' ? {
        ...candidate.parsedData,
        // Ensure array fields are actually arrays
        job_matches: 'job_matches' in candidate.parsedData && Array.isArray((candidate.parsedData as any).job_matches) ? (candidate.parsedData as any).job_matches : [],
        education: 'education' in candidate.parsedData && Array.isArray((candidate.parsedData as any).education) ? (candidate.parsedData as any).education : [],
        experience: 'experience' in candidate.parsedData && Array.isArray((candidate.parsedData as any).experience) ? (candidate.parsedData as any).experience : [],
        skills: 'skills' in candidate.parsedData && Array.isArray((candidate.parsedData as any).skills) ? (candidate.parsedData as any).skills : [],
        job_suitable: 'job_suitable' in candidate.parsedData && Array.isArray((candidate.parsedData as any).job_suitable) ? (candidate.parsedData as any).job_suitable : [],
      } : {};
      
      setSelectedCandidateSummary({
        id: candidate.id,
        name: formatCandidateName(candidate),
        email: candidate.email,
        phone: candidate.phone,
        status: candidate.status,
        position: candidate.position,
        fitScore: candidate.fitScore,
        parsedData: validatedParsedData
      });
      setIsModalOpen(true);
    }
  };

  // Get status color for YouTrack-style badges
  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'Applied': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
      'Screening': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
      'Interview Scheduled': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
      'Interviewing': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
      'Offer Sent': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
      'Offer Accepted': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
      'Hired': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
      'Rejected': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
      'Withdrawn': 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
  };

  return (
    <div>Test</div>
  );
}

// Flexible Kanban View that supports both row-based and column-based layouts
export function FlexibleKanbanView({ 
  candidates, 
  statuses, 
  onMoveCandidate, 
  onCardClick, 
  rowField = 'status', 
  columnField = 'recruiterId', 
  visibleFields = ['name', 'email', 'status', 'fitScore'], 
  visibleRowValues = [], 
  visibleColumnValues = [] 
}: CandidateKanbanViewProps) {
  const [draggedCandidate, setDraggedCandidate] = useState<Candidate | null>(null);
  const [dragOverRow, setDragOverRow] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  let rowValuesToShow = visibleRowValues.length > 0
    ? visibleRowValues
    : Array.from(new Set(candidates.map(c => (c[rowField as keyof typeof c] ?? c.customAttributes?.[rowField])))).filter(Boolean);
  if (rowValuesToShow.length === 0) {
    rowValuesToShow = ['All Candidates'];
  }
  const isColumnBased = columnField && columnField !== 'none';
  const isRowBased = rowField && rowField !== 'none';
  const showSingleRow = !isRowBased || rowField === 'none';
  const effectiveColumnValues = isColumnBased && visibleColumnValues.length > 0
    ? visibleColumnValues
    : Array.from(new Set(candidates.map(c => (c[columnField as keyof typeof c] ?? c.customAttributes?.[columnField])))).filter(Boolean);
  const effectiveColumnField = isColumnBased ? columnField : null;

  const handleCardClick = (candidate: Candidate) => {
    if (onCardClick) onCardClick(candidate);
  };
  const handleDragStart = (candidate: Candidate) => setDraggedCandidate(candidate);
  const handleDragEnd = () => setDraggedCandidate(null);
  const handleDragOver = (rowValue: string, colValue: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverRow(rowValue);
    setDragOverColumn(colValue);
  };
  const handleDrop = (rowValue: string, colValue: string) => {
    setDraggedCandidate(null);
    setDragOverRow(null);
    setDragOverColumn(null);
  };

  // If no candidates, show fallback
  if (!candidates || candidates.length === 0) {
    return (
      <div className="w-full min-h-[300px] bg-muted/30 rounded-lg p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-muted rounded-full flex items-center justify-center">
            <Plus className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-lg text-muted-foreground">No candidates found</p>
        </div>
      </div>
    );
  }

  // --- NEW LOGIC: Classic Kanban if rowField is 'none' and columnField is set ---
  if ((rowField === 'none' || !rowField) && columnField && columnField !== 'none') {
    // Use visibleColumnValues if provided, else fallback to all unique column values
    const columnsToShow = (visibleColumnValues && visibleColumnValues.length > 0)
      ? visibleColumnValues
      : effectiveColumnValues.length > 0
        ? effectiveColumnValues
        : ['All'];
    // Find candidates that do not match any column value
    const uncategorizedCandidates = candidates.filter(candidate => {
      const colValue = candidate[columnField as keyof typeof candidate] ?? candidate.customAttributes?.[columnField];
      return !columnsToShow.includes(colValue);
    });
    return (
      <div className="w-full h-[calc(100vh-200px)] bg-muted/30 rounded-lg p-4 flex gap-4">
        {columnsToShow.map((colValue) => {
          const colCandidates = candidates.filter(candidate =>
            (candidate[columnField as keyof typeof candidate] ?? candidate.customAttributes?.[columnField]) === colValue
          );
          return (
            <div key={colValue} className="flex flex-col h-full" style={{ flex: '1 1 0%' }}>
              <Card className="flex flex-col h-full shadow-sm border border-border bg-card">
                <CardHeader className="p-4 border-b border-border sticky top-0 bg-card z-10 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {colValue?.charAt(0)?.toUpperCase() || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm font-semibold text-foreground">{colValue}</CardTitle>
                      <p className="text-xs text-muted-foreground">{effectiveColumnField}</p>
                    </div>
                  </div>
                </CardHeader>
                <div className="flex-1 min-h-0 p-4 space-y-4">
                  {colCandidates.length > 0 ? (
                    <div className="space-y-2">
                      {colCandidates.map(candidate => (
                        <div
                          key={candidate.id}
                          className={cn(
                            "group w-full",
                            draggedCandidate?.id === candidate.id && "opacity-60 scale-95"
                          )}
                        >
                          <EnhancedCandidateCard
                            candidate={candidate}
                            isDragged={draggedCandidate?.id === candidate.id}
                            onClick={() => handleCardClick(candidate)}
                            onDragStart={() => handleDragStart(candidate)}
                            onDragEnd={handleDragEnd}
                            visibleFields={visibleFields}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-16">
                      <div className="text-center">
                        <Plus className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Drop here</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          );
        })}
        {/* Always show Uncategorized column */}
        <div key="uncategorized" className="flex flex-col h-full" style={{ flex: '1 1 0%' }}>
          <Card className="flex flex-col h-full shadow-sm border border-border bg-card">
            <CardHeader className="p-4 border-b border-border sticky top-0 bg-card z-10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-muted text-muted-foreground text-sm">?</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground">Uncategorized</CardTitle>
                  <p className="text-xs text-muted-foreground">{effectiveColumnField}</p>
                </div>
              </div>
            </CardHeader>
            <div className="flex-1 min-h-0 p-4 space-y-4">
              <div className="space-y-2">
                {uncategorizedCandidates.length > 0 ? uncategorizedCandidates.map(candidate => (
                  <div
                    key={candidate.id}
                    className={cn(
                      "group w-full",
                      draggedCandidate?.id === candidate.id && "opacity-60 scale-95"
                    )}
                  >
                    <EnhancedCandidateCard
                      candidate={candidate}
                      isDragged={draggedCandidate?.id === candidate.id}
                      onClick={() => handleCardClick(candidate)}
                      onDragStart={() => handleDragStart(candidate)}
                      onDragEnd={handleDragEnd}
                      visibleFields={visibleFields}
                    />
                  </div>
                )) : (
                  <div className="flex items-center justify-center h-16">
                    <div className="text-center">
                      <Plus className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Drop here</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }
  // --- END NEW LOGIC ---

  if (showSingleRow) {
    return (
      <div className="w-full h-[calc(100vh-200px)] bg-muted/30 rounded-lg p-4 flex flex-col gap-4 overflow-y-auto">
        <div className="flex flex-row flex-wrap gap-3">
          {candidates.map(candidate => (
            <div
              key={candidate.id}
              className={cn(
                "group w-full",
                draggedCandidate?.id === candidate.id && "opacity-60 scale-95"
              )}
            >
              <EnhancedCandidateCard
                candidate={candidate}
                isDragged={draggedCandidate?.id === candidate.id}
                onClick={() => handleCardClick(candidate)}
                onDragStart={() => handleDragStart(candidate)}
                onDragEnd={handleDragEnd}
                visibleFields={visibleFields}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isColumnBased) {
    // For row+column layout, add uncategorized row for each column if needed
    const uncategorizedByCol: Record<string, any[]> = {};
    effectiveColumnValues.forEach(colValue => {
      uncategorizedByCol[colValue] = candidates.filter(candidate => {
        const rowValue = candidate[rowField as keyof typeof candidate] ?? candidate.customAttributes?.[rowField];
        const colVal = candidate[columnField as keyof typeof candidate] ?? candidate.customAttributes?.[columnField];
        return colVal === colValue && !rowValuesToShow.includes(rowValue);
      });
    });
    // Find candidates that do not match any column value
    const uncategorizedColCandidates = candidates.filter(candidate => {
      const colVal = candidate[columnField as keyof typeof candidate] ?? candidate.customAttributes?.[columnField];
      return !effectiveColumnValues.includes(colVal);
    });
    return (
      <div className="w-full h-[calc(100vh-200px)] bg-muted/30 rounded-lg p-4 flex gap-4">
        {effectiveColumnValues.map((colValue) => (
          <div key={colValue} className="flex flex-col h-full" style={{ flex: '1 1 0%' }}>
            <Card className="flex flex-col h-full shadow-sm border border-border bg-card">
              <CardHeader className="p-4 border-b border-border sticky top-0 bg-card z-10 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {colValue?.charAt(0)?.toUpperCase() || 'C'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-sm font-semibold text-foreground">{colValue}</CardTitle>
                    <p className="text-xs text-muted-foreground">{effectiveColumnField}</p>
                  </div>
                </div>
              </CardHeader>
              <div className="flex-1 min-h-0 p-4 space-y-4">
                {rowValuesToShow.map(rowValue => {
                  const cellCandidates = candidates.filter(candidate =>
                    (candidate[rowField as keyof typeof candidate] ?? candidate.customAttributes?.[rowField]) === rowValue &&
                    (candidate[columnField as keyof typeof candidate] ?? candidate.customAttributes?.[columnField]) === colValue
                  );
                  return (
                    <div key={rowValue} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{rowValue}</span>
                        <Badge variant="secondary" className="text-xs">
                          {cellCandidates.length}
                        </Badge>
                      </div>
                      <div
                        className={cn(
                          "min-h-[80px] p-2 rounded-lg border-2 border-dashed border-muted transition-all duration-200",
                          dragOverRow === rowValue && dragOverColumn === colValue && "border-primary bg-primary/5"
                        )}
                        onDragOver={(e) => handleDragOver(rowValue, colValue, e)}
                        onDrop={() => handleDrop(rowValue, colValue)}
                      >
                        {cellCandidates.length > 0 ? (
                          <div className="space-y-2">
                            {cellCandidates.map(candidate => (
                              <div
                                key={candidate.id}
                                className={cn(
                                  "group w-full",
                                  draggedCandidate?.id === candidate.id && "opacity-60 scale-95"
                                )}
                              >
                                <EnhancedCandidateCard
                                  candidate={candidate}
                                  isDragged={draggedCandidate?.id === candidate.id}
                                  onClick={() => handleCardClick(candidate)}
                                  onDragStart={() => handleDragStart(candidate)}
                                  onDragEnd={handleDragEnd}
                                  visibleFields={visibleFields}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-16">
                            <div className="text-center">
                              <Plus className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">Drop here</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {/* Always show Uncategorized row for this column */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Uncategorized</span>
                    <Badge variant="secondary" className="text-xs">
                      {uncategorizedByCol[colValue].length}
                    </Badge>
                  </div>
                  <div className="min-h-[80px] p-2 rounded-lg border-2 border-dashed border-muted transition-all duration-200">
                    <div className="space-y-2">
                      {uncategorizedByCol[colValue].length > 0 ? uncategorizedByCol[colValue].map(candidate => (
                        <div
                          key={candidate.id}
                          className={cn(
                            "group w-full",
                            draggedCandidate?.id === candidate.id && "opacity-60 scale-95"
                          )}
                        >
                          <EnhancedCandidateCard
                            candidate={candidate}
                            isDragged={draggedCandidate?.id === candidate.id}
                            onClick={() => handleCardClick(candidate)}
                            onDragStart={() => handleDragStart(candidate)}
                            onDragEnd={handleDragEnd}
                            visibleFields={visibleFields}
                          />
                        </div>
                      )) : (
                        <div className="flex items-center justify-center h-16">
                          <div className="text-center">
                            <Plus className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Drop here</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ))}
        {/* Always show Uncategorized column for unmatched columns */}
        <div key="uncategorized-col" className="flex flex-col h-full" style={{ flex: '1 1 0%' }}>
          <Card className="flex flex-col h-full shadow-sm border border-border bg-card">
            <CardHeader className="p-4 border-b border-border sticky top-0 bg-card z-10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-muted text-muted-foreground text-sm">?</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground">Uncategorized</CardTitle>
                  <p className="text-xs text-muted-foreground">{effectiveColumnField}</p>
                </div>
              </div>
            </CardHeader>
            <div className="flex-1 min-h-0 p-4 space-y-4">
              {rowValuesToShow.map(rowValue => {
                const cellCandidates = uncategorizedColCandidates.filter(candidate =>
                  (candidate[rowField as keyof typeof candidate] ?? candidate.customAttributes?.[rowField]) === rowValue
                );
                return (
                  <div key={rowValue} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{rowValue}</span>
                      <Badge variant="secondary" className="text-xs">
                        {cellCandidates.length}
                      </Badge>
                    </div>
                    <div className="min-h-[80px] p-2 rounded-lg border-2 border-dashed border-muted transition-all duration-200">
                      {cellCandidates.length > 0 ? (
                        <div className="space-y-2">
                          {cellCandidates.map(candidate => (
                            <div
                              key={candidate.id}
                              className={cn(
                                "group w-full",
                                draggedCandidate?.id === candidate.id && "opacity-60 scale-95"
                              )}
                            >
                              <EnhancedCandidateCard
                                candidate={candidate}
                                isDragged={draggedCandidate?.id === candidate.id}
                                onClick={() => handleCardClick(candidate)}
                                onDragStart={() => handleDragStart(candidate)}
                                onDragEnd={handleDragEnd}
                                visibleFields={visibleFields}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-16">
                          <div className="text-center">
                            <Plus className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Drop here</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Grouped row layout (no columns)
  return (
    <div className="w-full h-[calc(100vh-200px)] bg-muted/30 rounded-lg p-4 flex flex-col gap-4 overflow-y-auto">
      <div className="grid grid-cols-1 gap-4">
        {rowValuesToShow.map(rowValue => {
          // If fallback, show all candidates
          const rowCandidates = rowValue === 'All Candidates'
            ? candidates
            : candidates.filter(candidate =>
                (candidate[rowField as keyof typeof candidate] ?? candidate.customAttributes?.[rowField]) === rowValue
              );
          return (
            <div
              key={rowValue}
              className={cn(
                "flex flex-row items-center gap-4 transition-all duration-200 border border-border rounded-lg p-4 bg-card shadow-sm",
                dragOverRow === rowValue && "ring-2 ring-primary/60 bg-primary/5"
              )}
              onDragOver={(e) => handleDragOver(rowValue, 'default', e)}
              onDrop={() => handleDrop(rowValue, 'default')}
            >
              <div className="w-40 flex-shrink-0 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span className="font-semibold text-base capitalize text-foreground">{rowValue}</span>
                </div>
                <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {rowCandidates.length} candidates
                </Badge>
              </div>
              <div className="flex-1 min-h-[80px]">
                <div className="flex flex-row flex-wrap gap-3">
                  {rowCandidates.map(candidate => (
                    <div
                      key={candidate.id}
                      className={cn(
                        "group w-full",
                        draggedCandidate?.id === candidate.id && "opacity-60 scale-95"
                      )}
                    >
                      <EnhancedCandidateCard
                        candidate={candidate}
                        isDragged={draggedCandidate?.id === candidate.id}
                        onClick={() => handleCardClick(candidate)}
                        onDragStart={() => handleDragStart(candidate)}
                        onDragEnd={handleDragEnd}
                        visibleFields={visibleFields}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// Single Row Candidate View for use within each row when there's only 1 column or no columns
export function SingleRowCandidateView({ 
  candidates, 
  onCardClick, 
  onMoveCandidate, 
  visibleFields = ['name', 'email', 'status', 'fitScore']
}: { 
  candidates: Candidate[];
  onCardClick?: (candidate: Candidate) => void;
  onMoveCandidate?: (candidate: Candidate, newValue: string) => void;
  visibleFields?: string[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrevious = () => {
    setCurrentIndex(prev => prev > 0 ? prev - 1 : candidates.length - 1);
  };

  const handleNext = () => {
    setCurrentIndex(prev => prev < candidates.length - 1 ? prev + 1 : 0);
  };

  const currentCandidate = candidates[currentIndex];

  // Reset index when candidates change
  useEffect(() => {
    setCurrentIndex(0);
  }, [candidates.length]);

  // Get status color for YouTrack-style badges
  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'Applied': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
      'Screening': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
      'Interview Scheduled': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
      'Interviewing': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
      'Offer Sent': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
      'Offer Accepted': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
      'Hired': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
      'Rejected': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
      'Withdrawn': 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
  };

  if (candidates.length === 0) {
    return (
      <div className="flex items-center justify-center w-full py-8">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-muted rounded-full flex items-center justify-center">
            <Plus className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No candidates</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Drag candidates here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 w-full">
      {/* Navigation Controls */}
      {candidates.length > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Badge variant="secondary" className="text-xs">
            {currentIndex + 1} of {candidates.length}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Candidate Card */}
      {currentCandidate && (
        <div className="flex-1">
          <Card className="p-4 hover:shadow-md transition-all duration-200 bg-card border border-border flex items-center gap-4">
            <Avatar className="h-12 w-12 flex-shrink-0">
              <AvatarImage 
                src={currentCandidate.avatarUrl || `https://placehold.co/48x48.png?text=${formatCandidateName(currentCandidate)?.charAt(0) || 'C'}`} 
                alt={formatCandidateName(currentCandidate)} 
              />
              <AvatarFallback className="bg-primary/10 text-primary">
                {formatCandidateName(currentCandidate)?.charAt(0)?.toUpperCase() || 'C'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-foreground truncate" title={formatCandidateName(currentCandidate)}>
                    {formatCandidateName(currentCandidate)}
                  </p>
                  {visibleFields.includes('positionId') && (
                    <p className="text-xs text-muted-foreground truncate" title={currentCandidate.position?.title || 'N/A'}>
                      <Target className="w-3 h-3 inline mr-1" />
                      {currentCandidate.position?.title || 'N/A'}
                    </p>
                  )}
                </div>
                
                {/* Status Badge */}
                <Badge className={cn(
                  "text-xs px-2 py-1",
                  getStatusColor(currentCandidate.status)
                )}>
                  {currentCandidate.status || 'Unknown'}
                </Badge>
              </div>

              {/* Contact Information */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {visibleFields.includes('email') && currentCandidate.email && (
                  <div className="flex items-center">
                    <Mail className="w-3 h-3 mr-1" />
                    <span className="truncate">{currentCandidate.email}</span>
                  </div>
                )}
                {visibleFields.includes('phone') && currentCandidate.phone && (
                  <div className="flex items-center">
                    <Phone className="w-3 h-3 mr-1" />
                    <span>{currentCandidate.phone}</span>
                  </div>
                )}
                {visibleFields.includes('applicationDate') && currentCandidate.applicationDate && (
                  <div className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    <span>Applied: {new Date(currentCandidate.applicationDate).toLocaleDateString()}</span>
                  </div>
                )}
                {visibleFields.includes('recruiterId') && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <User className="w-3 h-3 mr-1" />
                    <span>{currentCandidate.recruiter?.name || currentCandidate.recruiterId || 'Unassigned'}</span>
                  </div>
                )}
              </div>

              {/* Fit Score */}
              {visibleFields.includes('fitScore') && currentCandidate.fitScore !== undefined && currentCandidate.fitScore !== null && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{getFieldLabel('fitScore')}</span>
                    <span className="font-medium text-foreground">{currentCandidate.fitScore}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={cn("h-2 rounded-full transition-all duration-300", getScoreBgColor(currentCandidate.fitScore))}
                      style={{ width: `${currentCandidate.fitScore}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => onCardClick?.(currentCandidate)}
                className="flex items-center gap-1"
              >
                <Eye className="w-3 h-3" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Handle edit action
                  console.log('Edit candidate:', currentCandidate.id);
                }}
                className="flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Progress Indicator */}
      {candidates.length > 1 && (
        <div className="flex gap-1">
          {candidates.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                index === currentIndex 
                  ? "bg-primary" 
                  : "bg-muted hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Single Row Kanban View for when there's only 1 column or no columns
export function SingleRowKanbanView({ 
  candidates, 
  statuses, 
  onMoveCandidate, 
  onCardClick, 
  rowField = 'status', 
  columnField = 'recruiterId', 
  visibleFields = ['name', 'email', 'status', 'fitScore'], 
  visibleRowValues = [], 
  visibleColumnValues = [] 
}: CandidateKanbanViewProps & { visibleFields?: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCandidateSummary, setSelectedCandidateSummary] = useState<Partial<Candidate> & { id: string; name: string } | null>(null);

  // Filter candidates to only show those that match the current row/column configuration
  const filteredCandidates = useMemo(() => {
    return candidates.filter(candidate => {
      const rowValue = (candidate[rowField as keyof Candidate] ?? candidate.customAttributes?.[rowField]);
      const colValue = columnField && columnField !== 'none' 
        ? (candidate[columnField as keyof Candidate] ?? candidate.customAttributes?.[columnField])
        : null;
      
      // FIXED: More permissive filtering logic
      let rowMatch = true;
      if (rowField && rowField !== 'none') {
        if (visibleRowValues.length > 0) {
          // If visible row values are specified, candidate must match one of them
          rowMatch = Boolean(typeof rowValue === 'string' && !!rowValue && visibleRowValues.includes(rowValue as string));
        } else {
          // If no visible row values specified, show all candidates (don't filter by row)
          rowMatch = true;
        }
      }
      
      let colMatch = true;
      if (columnField && columnField !== 'none') {
        if (visibleColumnValues.length > 0) {
          // If visible column values are specified, candidate must match one of them
          if (!colValue) {
            colMatch = true; // No column value means it matches
          } else {
            colMatch = Boolean(typeof colValue === 'string' && !!colValue && visibleColumnValues.includes(colValue as string));
          }
        } else {
          // If no visible column values specified, show all candidates (don't filter by column)
          colMatch = true;
        }
      }
      
      return rowMatch && colMatch;
    });
  }, [candidates, rowField, columnField, visibleRowValues, visibleColumnValues]);

  const handleCardClick = (candidate: Candidate) => {
    if (onCardClick) {
      onCardClick(candidate);
    } else {
      // Validate parsedData to ensure it has the expected structure
      const validatedParsedData = candidate.parsedData && typeof candidate.parsedData === 'object' ? {
        ...candidate.parsedData,
        // Ensure array fields are actually arrays
        job_matches: 'job_matches' in candidate.parsedData && Array.isArray((candidate.parsedData as any).job_matches) ? (candidate.parsedData as any).job_matches : [],
        education: 'education' in candidate.parsedData && Array.isArray((candidate.parsedData as any).education) ? (candidate.parsedData as any).education : [],
        experience: 'experience' in candidate.parsedData && Array.isArray((candidate.parsedData as any).experience) ? (candidate.parsedData as any).experience : [],
        skills: 'skills' in candidate.parsedData && Array.isArray((candidate.parsedData as any).skills) ? (candidate.parsedData as any).skills : [],
        job_suitable: 'job_suitable' in candidate.parsedData && Array.isArray((candidate.parsedData as any).job_suitable) ? (candidate.parsedData as any).job_suitable : [],
      } : {};
      
      setSelectedCandidateSummary({
        id: candidate.id,
        name: formatCandidateName(candidate),
        email: candidate.email,
        phone: candidate.phone,
        status: candidate.status,
        position: candidate.position,
        fitScore: candidate.fitScore,
        parsedData: validatedParsedData
      });
      setIsModalOpen(true);
    }
  };

  const handlePrevious = () => {
    setCurrentIndex(prev => prev > 0 ? prev - 1 : filteredCandidates.length - 1);
  };

  const handleNext = () => {
    setCurrentIndex(prev => prev < filteredCandidates.length - 1 ? prev + 1 : 0);
  };

  const currentCandidate = filteredCandidates[currentIndex];

  // Reset index when candidates change
  useEffect(() => {
    setCurrentIndex(0);
  }, [filteredCandidates.length]);

  // Get status color for YouTrack-style badges
  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'Applied': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
      'Screening': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
      'Interview Scheduled': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
      'Interviewing': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
      'Offer Sent': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
      'Offer Accepted': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
      'Hired': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
      'Rejected': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
      'Withdrawn': 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
  };

  if (filteredCandidates.length === 0) {
    return (
      <>
        <div className="w-full h-[calc(100vh-200px)] bg-muted/30 rounded-lg p-4 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No candidates found</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {candidates.length > 0 
                ? "No candidates match the current board configuration. Try adjusting your board settings or resetting to default."
                : "No candidates available. Please add some candidates first."
              }
            </p>
            {candidates.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <p>Current configuration:</p>
                <p>Row: {rowField} | Column: {columnField}</p>
                <p>Visible rows: {visibleRowValues.length > 0 ? visibleRowValues.join(', ') : 'All'}</p>
                <p>Visible columns: {visibleColumnValues.length > 0 ? visibleColumnValues.join(', ') : 'All'}</p>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="w-full h-[calc(100vh-200px)] bg-muted/30 rounded-lg p-4 flex items-center justify-center">
        <div className="w-full max-w-4xl">
          {/* Navigation Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-foreground">My Tasks</h2>
              <Badge variant="secondary" className="text-sm">
                {currentIndex + 1} of {filteredCandidates.length}
              </Badge>
            </div>
            
            {/* Navigation Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={filteredCandidates.length <= 1}
                className="h-9 px-3"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={filteredCandidates.length <= 1}
                className="h-9 px-3"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Candidate Card */}
          <div className="bg-card border border-border rounded-lg shadow-sm p-6">
            {currentCandidate && (
              <div className="flex items-start gap-6">
                {/* Avatar and Basic Info */}
                <div className="flex-shrink-0">
                  <Avatar className="h-20 w-20">
                    <AvatarImage 
                      src={currentCandidate.avatarUrl || `https://placehold.co/80x80.png?text=${formatCandidateName(currentCandidate)?.charAt(0) || 'C'}`} 
                      alt={formatCandidateName(currentCandidate)} 
                    />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {formatCandidateName(currentCandidate)?.charAt(0)?.toUpperCase() || 'C'}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Candidate Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-1">
                        {formatCandidateName(currentCandidate)}
                      </h3>
                      <p className="text-muted-foreground">
                        <Target className="w-4 h-4 inline mr-2" />
                        {currentCandidate.position?.title || 'No position assigned'}
                      </p>
                    </div>
                    
                    {/* Status Badge */}
                    <Badge className={cn(
                      "text-sm px-3 py-1",
                      getStatusColor(currentCandidate.status)
                    )}>
                      {currentCandidate.status || 'Unknown'}
                    </Badge>
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {visibleFields.includes('email') && currentCandidate.email && (
                      <div className="flex items-center text-sm">
                        <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="text-foreground">{currentCandidate.email}</span>
                      </div>
                    )}
                    {visibleFields.includes('phone') && currentCandidate.phone && (
                      <div className="flex items-center text-sm">
                        <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="text-foreground">{currentCandidate.phone}</span>
                      </div>
                    )}
                    {visibleFields.includes('applicationDate') && currentCandidate.applicationDate && (
                      <div className="flex items-center text-sm">
                        <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="text-foreground">
                          Applied: {new Date(currentCandidate.applicationDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {visibleFields.includes('recruiterId') && (
                      <div className="flex items-center text-sm">
                        <User className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="text-foreground">{currentCandidate.recruiter?.name || currentCandidate.recruiterId || 'Unassigned'}</span>
                      </div>
                    )}
                  </div>

                  {/* Fit Score */}
                  {visibleFields.includes('fitScore') && currentCandidate.fitScore !== undefined && currentCandidate.fitScore !== null && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">{getFieldLabel('fitScore')}</span>
                        <span className="text-sm font-semibold text-foreground">
                          {currentCandidate.fitScore}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div 
                          className={cn("h-3 rounded-full transition-all duration-300", getScoreBgColor(currentCandidate.fitScore))}
                          style={{ width: `${currentCandidate.fitScore}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => handleCardClick(currentCandidate)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Handle edit action
                        console.log('Edit candidate:', currentCandidate.id);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Progress Indicator */}
          {filteredCandidates.length > 1 && (
            <div className="flex items-center justify-center mt-6">
              <div className="flex gap-2">
                {filteredCandidates.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-200",
                      index === currentIndex 
                        ? "bg-primary" 
                        : "bg-muted hover:bg-muted-foreground/50"
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Candidate Detail Modal - only show if onCardClick is not provided */}
      {!onCardClick && selectedCandidateSummary && (
        <FullCandidateDetail candidateId={selectedCandidateSummary.id} isModal={true} onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}

export function MultiRecruiterKanbanView({ candidates, stages, recruiters, onMoveCandidate, onCardClick }: any) {
  const [draggedCandidate, setDraggedCandidate] = useState<any>(null);
  const [dragOverStage, setDragOverStage] = useState<any>(null);
  const [dragOverRecruiter, setDragOverRecruiter] = useState<any>(null);

  const handleDragStart = (candidate: any) => setDraggedCandidate(candidate);
  const handleDragEnd = () => {
    setDraggedCandidate(null);
    setDragOverStage(null);
    setDragOverRecruiter(null);
  };
  const handleDragOver = (stage: any, recruiter: any, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverStage(stage);
    setDragOverRecruiter(recruiter);
  };
  const handleDrop = (stage: any, recruiter: any) => {
    if (draggedCandidate) {
      onMoveCandidate?.(draggedCandidate, stage, recruiter.id);
    }
    setDraggedCandidate(null);
    setDragOverStage(null);
    setDragOverRecruiter(null);
  };

  const handleCardClick = (candidate: any) => {
    if (onCardClick) {
      onCardClick(candidate);
    }
  };

  // Get status color for YouTrack-style badges
  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'Applied': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
      'Screening': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
      'Interview Scheduled': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
      'Interviewing': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
      'Offer Sent': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
      'Offer Accepted': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
      'Hired': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
      'Rejected': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
      'Withdrawn': 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
  };

  return (
    <div className="w-full h-[calc(100vh-200px)] bg-muted/30 rounded-lg p-4 flex gap-4">
      {recruiters.map((recruiter: any) => (
        <div key={recruiter.id} className="flex-shrink-0 w-80 flex flex-col h-full">
          <Card className="flex flex-col h-full shadow-sm border border-border bg-card">
            <CardHeader className="p-4 border-b border-border sticky top-0 bg-card z-10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={recruiter.avatarUrl} alt={recruiter.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {recruiter.name?.charAt(0)?.toUpperCase() || 'R'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground">{recruiter.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">Recruiter</p>
                </div>
              </div>
            </CardHeader>
            <ScrollArea className="flex-1 min-h-0">
              <CardContent className="p-4 space-y-4">
                {stages.map((stage: any) => {
                  const stageCandidates = candidates.filter((c: any) => c.status === stage && c.recruiterId === recruiter.id);
                  return (
                    <div key={stage} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{stage}</span>
                        <Badge variant="secondary" className="text-xs">
                          {stageCandidates.length}
                        </Badge>
                      </div>
                      <div
                        className={cn(
                          "min-h-[80px] p-2 rounded-lg border-2 border-dashed border-muted transition-all duration-200",
                          dragOverStage === stage && dragOverRecruiter?.id === recruiter.id && "border-primary bg-primary/5"
                        )}
                        onDragOver={(e) => handleDragOver(stage, recruiter, e)}
                        onDrop={() => handleDrop(stage, recruiter)}
                      >
                        {stageCandidates.length > 0 ? (
                          <div className="space-y-2">
                            {stageCandidates.map((candidate: any) => (
                              <div
                                key={candidate.id}
                                className={cn(
                                  "cursor-pointer group p-3 bg-card border border-border rounded-lg hover:shadow-sm transition-all duration-200",
                                  draggedCandidate?.id === candidate.id && "opacity-60 scale-95"
                                )}
                                draggable
                                onDragStart={() => handleDragStart(candidate)}
                                onDragEnd={handleDragEnd}
                                onClick={() => handleCardClick(candidate)}
                              >
                                <div className="flex items-start gap-2">
                                  <Avatar className="h-6 w-6 flex-shrink-0">
                                    <AvatarImage src={candidate.avatarUrl || `https://placehold.co/40x40.png?text=${formatCandidateName(candidate)?.charAt(0) || 'C'}`} alt={formatCandidateName(candidate)} />
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                      {formatCandidateName(candidate)?.charAt(0)?.toUpperCase() || 'C'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-foreground truncate" title={formatCandidateName(candidate)}>
                                      {formatCandidateName(candidate)}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate" title={candidate.position?.title || 'N/A'}>
                                      {candidate.position?.title || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                                {candidate.fitScore !== undefined && candidate.fitScore !== null && (
                                  <div className="mt-2 space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">{getFieldLabel('fitScore')}</span>
                                      <span className="font-medium text-foreground">{candidate.fitScore}%</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-1">
                                      <div 
                                        className={cn("h-1 rounded-full transition-all duration-300", getScoreBgColor(candidate.fitScore))}
                                        style={{ width: `${candidate.fitScore}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-16">
                            <div className="text-center">
                              <Plus className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">Drop here</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </ScrollArea>
          </Card>
        </div>
      ))}
    </div>
  );
}
