// src/components/candidates/CandidateKanbanView.tsx
"use client";

import * as React from 'react';
import { useState, useMemo, useEffect, useRef } from 'react';
import type { Candidate, CandidateStatus, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { CandidateAvatar } from '@/components/ui/candidate-avatar';
import { RecruiterAvatarCompact } from '@/components/ui/recruiter-avatar';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CandidateDetailModal from './CandidateDetailModal';
import FullCandidateDetail from './FullCandidateDetail';
import { Pencil, Trash2, MoveRight, Plus, Calendar, Target, User, Mail, Phone, Clock, TrendingUp, ChevronLeft, ChevronRight, Eye, Users, GraduationCap, Briefcase, HardDrive } from 'lucide-react';
import { formatScoreWithGrade, getScoreColor, getScoreBgColor, normalizeFitScore, getScoreGradeInfo } from "@/lib/scoreUtils";
import { formatCandidateName, formatCandidateNameWithLang } from "@/lib/candidateUtils";
import { getCandidatePersonalColor, getCandidateCardStyles } from "@/lib/personalColorUtils";
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

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
const EnhancedCandidateCard = ({ candidate, isDragged = false, onClick, onDragStart, onDragEnd, visibleFields = ['name', 'email', 'status', 'fitScore'], columnField = 'status', recruiters }: {
  candidate: Candidate;
  isDragged?: boolean;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  visibleFields?: string[];
  columnField?: string;
  recruiters?: UserProfile[];
}) => {
  const [isDragStarting, setIsDragStarting] = useState(false);
  const dragImageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
  const personalColor = getCandidatePersonalColor(candidate, recruiters);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragStarting(true);
    onDragStart();
    
    // Set drag image and data
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', candidate.id);
      e.dataTransfer.setData('application/json', JSON.stringify(candidate));
      
      // Create a custom drag image
      const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
      dragImage.style.opacity = '0.8';
      dragImage.style.transform = 'rotate(5deg)';
      dragImage.style.width = '200px';
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 100, 50);
      
      // Remove the drag image after a short delay
      const timeoutId = setTimeout(() => {
        if (document.body.contains(dragImage)) {
          document.body.removeChild(dragImage);
        }
      }, 100);
      
      // Store timeout ID for cleanup
      if (dragImageTimeoutRef.current) {
        clearTimeout(dragImageTimeoutRef.current);
      }
      dragImageTimeoutRef.current = timeoutId;
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragStarting(false);
    onDragEnd();
  };

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (dragImageTimeoutRef.current) {
        clearTimeout(dragImageTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Card 
      className={cn(
        "w-full p-4 hover:shadow-md transition-all duration-200 bg-card border border-border flex flex-col gap-3 relative",
        columnField === 'status' ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        isDragged && "opacity-60 scale-95 shadow-lg",
        isDragStarting && "scale-105 shadow-xl"
      )}
      style={{
        borderColor: personalColor,
        backgroundColor: `${personalColor}05`,
      }}
      onClick={onClick}
      draggable={columnField === 'status'}
      onDragStart={columnField === 'status' ? handleDragStart : undefined}
      onDragEnd={columnField === 'status' ? handleDragEnd : undefined}
    >
      {/* Name and position always shown */}
      {visibleFields.includes('name') && (() => {
        const nameInfo = formatCandidateNameWithLang(candidate);
        return (
          <div className="flex items-start gap-3">
            <CandidateAvatar 
              user={candidate}
              size="md"
              className="h-10 w-10 flex-shrink-0"
            />
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
                {candidate.fitScore === null || candidate.fitScore === undefined ? 'Not scored' : formatScoreWithGrade(candidate.fitScore)}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={cn("h-2 rounded-full transition-all duration-300", getScoreBgColor(candidate.fitScore))}
                style={{ width: `${normalizeFitScore(candidate.fitScore)}%` }}
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
  recruiters?: UserProfile[];
  onMoveCandidate?: (candidate: Candidate, newValue: string) => void;
  onCardClick?: (candidate: Candidate) => void;
  showAddButton?: boolean;
  rowField?: string;
  columnField?: string;
  visibleFields?: string[];
  visibleRowValues?: string[];
  visibleColumnValues?: string[];
  isLoading?: boolean;
}

export function CandidateKanbanView({
  candidates,
  statuses,
  recruiters,
  onMoveCandidate,
  onCardClick,
  showAddButton = true,
  rowField = 'status',
  columnField = 'none',
  visibleFields = ['name', 'email', 'status', 'fitScore'],
  visibleRowValues = [],
  visibleColumnValues = [],
  isLoading = false,
}: CandidateKanbanViewProps) {
  // Show loading state
  if (isLoading) {
    return (
      <div className="w-full min-h-[300px] bg-muted/30 rounded-lg p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-muted rounded-full flex items-center justify-center animate-pulse">
            <Users className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-lg text-muted-foreground">Loading candidates...</p>
        </div>
      </div>
    );
  }

  // If there are no candidates at all
  if (candidates.length === 0) {
    return (
      <div className="w-full min-h-[300px] p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center">
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
      recruiters={recruiters}
      onMoveCandidate={onMoveCandidate}
      onCardClick={onCardClick}
      showAddButton={showAddButton}
      rowField={rowField}
      columnField={columnField}
      visibleFields={visibleFields}
      visibleRowValues={visibleRowValues}
      visibleColumnValues={visibleColumnValues}
      isLoading={isLoading}
    />
  );
}

// Enhanced Row-based Kanban (stages as rows, candidates as draggable cards)
export function CandidateRowKanbanView({ 
  candidates, 
  statuses, 
  recruiters,
  onMoveCandidate, 
  onCardClick, 
  rowField = 'status', 
  columnField = 'recruiterId', 
  visibleFields = ['name', 'email', 'status', 'fitScore'], 
  visibleRowValues = [], 
  visibleColumnValues = [],
  isLoading = false
}: CandidateKanbanViewProps) {
  const [draggedCandidate, setDraggedCandidate] = useState<Candidate | null>(null);
  const [dragOverRowValue, setDragOverRowValue] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCandidateSummary, setSelectedCandidateSummary] = useState<Partial<Candidate> & { id: string; name: string } | null>(null);

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-full min-h-[300px] p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center animate-pulse">
            <Users className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-lg text-muted-foreground">Loading candidates...</p>
        </div>
      </div>
    );
  }

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
  recruiters,
  onMoveCandidate, 
  onCardClick, 
  rowField = 'status', 
  columnField = 'recruiterId', 
  visibleFields = ['name', 'email', 'status', 'fitScore'], 
  visibleRowValues = [], 
  visibleColumnValues = [],
  isLoading = false
}: CandidateKanbanViewProps) {
  const [draggedCandidate, setDraggedCandidate] = useState<Candidate | null>(null);
  const [dragOverRow, setDragOverRow] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="w-full min-h-[300px] bg-muted/30 rounded-lg p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-muted rounded-full flex items-center justify-center animate-pulse">
            <Users className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-lg text-muted-foreground">Loading candidates...</p>
        </div>
      </div>
    );
  }
  
  // Helper function to get the proper value for a field
  const getFieldValue = (candidate: Candidate, field: string) => {
    if (field === 'recruiterId') {
      return candidate.recruiter?.name || 'Unassigned';
    }
    if (field === 'positionId') {
      return candidate.position?.title || candidate.positionId || 'No Position';
    }
    return candidate[field as keyof typeof candidate] ?? candidate.customAttributes?.[field];
  };

  let rowValuesToShow = visibleRowValues.length > 0
    ? visibleRowValues
    : Array.from(new Set(candidates.map(c => getFieldValue(c, rowField)))).filter(Boolean);
  if (rowValuesToShow.length === 0) {
    rowValuesToShow = ['All Candidates'];
  }
  const isColumnBased = columnField && columnField !== 'none';
  const isRowBased = rowField && rowField !== 'none';
  const showSingleRow = !isRowBased || rowField === 'none';
  const effectiveColumnValues = isColumnBased && visibleColumnValues.length > 0
    ? visibleColumnValues
    : Array.from(new Set(candidates.map(c => getFieldValue(c, columnField)))).filter(Boolean);
  const effectiveColumnField = isColumnBased ? columnField : null;

  const handleCardClick = (candidate: Candidate) => {
    if (onCardClick) onCardClick(candidate);
  };
  
  const handleDragStart = (candidate: Candidate) => {
    setDraggedCandidate(candidate);
    setIsDragging(true);
    document.body.style.cursor = 'grabbing';
  };
  
  const handleDragEnd = () => {
    setDraggedCandidate(null);
    setDragOverRow(null);
    setDragOverColumn(null);
    setIsDragging(false);
    document.body.style.cursor = '';
  };
  
  const handleDragOver = (rowValue: string, colValue: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only allow dropping if we're dragging a candidate
    if (draggedCandidate) {
      setDragOverRow(rowValue);
      setDragOverColumn(colValue);
      e.dataTransfer.dropEffect = 'move';
    }
  };
  
  const handleDragLeave = (rowValue: string, colValue: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we're actually leaving the drop zone
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverRow(null);
      setDragOverColumn(null);
    }
  };
  
  const handleDrop = (rowValue: string, colValue: string) => {
    if (draggedCandidate) {
      // Determine which field to update based on the layout
      if (isColumnBased && !isRowBased) {
        // Column-based layout: update column field
        const newValue = colValue;
        if (getFieldValue(draggedCandidate, columnField) !== newValue) {
          onMoveCandidate?.(draggedCandidate, newValue);
        }
      } else if (isRowBased && !isColumnBased) {
        // Row-based layout: update row field
        const newValue = rowValue;
        if (getFieldValue(draggedCandidate, rowField) !== newValue) {
          onMoveCandidate?.(draggedCandidate, newValue);
        }
      } else if (isRowBased && isColumnBased) {
        // Both row and column: update both fields
        const updateData: any = {};
        if (getFieldValue(draggedCandidate, rowField) !== rowValue) {
          updateData[rowField] = rowValue;
        }
        if (getFieldValue(draggedCandidate, columnField) !== colValue) {
          updateData[columnField] = colValue;
        }
        
        if (Object.keys(updateData).length > 0) {
          // For now, prioritize row field update
          onMoveCandidate?.(draggedCandidate, rowValue);
        }
      }
    }
    
    setDraggedCandidate(null);
    setDragOverRow(null);
    setDragOverColumn(null);
    setIsDragging(false);
    document.body.style.cursor = '';
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
      const colValue = getFieldValue(candidate, columnField);
      return !columnsToShow.includes(colValue);
    });
    return (
      <div className="w-full h-[calc(100vh-200px)] bg-muted/30 rounded-lg p-4 flex gap-4">
        {columnsToShow.map((colValue) => {
          const colCandidates = candidates.filter(candidate =>
            getFieldValue(candidate, columnField) === colValue
          );
          return (
            <div key={colValue} className="flex flex-col h-full" style={{ flex: '1 1 0%' }}>
              <Card className={cn(
                "flex flex-col h-full shadow-sm border border-border bg-card transition-all duration-200",
                dragOverColumn === colValue && dragOverRow === 'none' && "ring-2 ring-primary ring-opacity-50 bg-primary/5"
              )}>
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
                <div 
                  className={cn(
                    "flex-1 min-h-0 p-4 space-y-4 transition-all duration-200 relative",
                    dragOverColumn === colValue && dragOverRow === 'none' && "bg-primary/5"
                  )}
                  onDragOver={(e) => handleDragOver('none', colValue, e)}
                  onDragLeave={(e) => handleDragLeave('none', colValue, e)}
                  onDrop={() => handleDrop('none', colValue)}
                >
                  {/* Drop zone indicator */}
                  {dragOverColumn === colValue && dragOverRow === 'none' && (
                    <div className="absolute inset-0 border-2 border-dashed border-primary/50 bg-primary/5 rounded-lg pointer-events-none z-10 flex items-center justify-center">
                      <div className="text-center">
                        <Plus className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <p className="text-sm font-medium text-primary">Drop here</p>
                        <p className="text-xs text-primary/70">Move to {colValue}</p>
                      </div>
                    </div>
                  )}
                  
                  {colCandidates.length > 0 ? (
                    <div className="space-y-2">
                      {colCandidates.map(candidate => (
                        <div
                          key={candidate.id}
                          className={cn(
                            "group w-full transition-all duration-200",
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
                            recruiters={recruiters}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={cn(
                      "flex items-center justify-center h-16 border-2 border-dashed rounded-lg transition-all duration-200",
                      dragOverColumn === colValue && dragOverRow === 'none' 
                        ? "border-primary bg-primary/5" 
                        : "border-muted"
                    )}>
                      <div className="text-center">
                        <Plus className={cn(
                          "w-4 h-4 mx-auto mb-1 transition-colors duration-200",
                          dragOverColumn === colValue && dragOverRow === 'none' ? "text-primary" : "text-muted-foreground"
                        )} />
                        <p className={cn(
                          "text-xs transition-colors duration-200",
                          dragOverColumn === colValue && dragOverRow === 'none' ? "text-primary font-medium" : "text-muted-foreground"
                        )}>
                          {dragOverColumn === colValue && dragOverRow === 'none' ? "Drop here" : "Drop here"}
                        </p>
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
          <Card className={cn(
            "flex flex-col h-full shadow-sm border border-border bg-card transition-all duration-200",
            dragOverColumn === 'uncategorized' && dragOverRow === 'none' && "ring-2 ring-primary ring-opacity-50 bg-primary/5"
          )}>
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
            <div 
              className={cn(
                "flex-1 min-h-0 p-4 space-y-4 transition-all duration-200 relative",
                dragOverColumn === 'uncategorized' && dragOverRow === 'none' && "bg-primary/5"
              )}
              onDragOver={(e) => handleDragOver('none', 'uncategorized', e)}
              onDragLeave={(e) => handleDragLeave('none', 'uncategorized', e)}
              onDrop={() => handleDrop('none', 'uncategorized')}
            >
              {/* Drop zone indicator */}
              {dragOverColumn === 'uncategorized' && dragOverRow === 'none' && (
                <div className="absolute inset-0 border-2 border-dashed border-primary/50 bg-primary/5 rounded-lg pointer-events-none z-10 flex items-center justify-center">
                  <div className="text-center">
                    <Plus className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium text-primary">Drop here</p>
                    <p className="text-xs text-primary/70">Move to Uncategorized</p>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                {uncategorizedCandidates.length > 0 ? uncategorizedCandidates.map(candidate => (
                  <div
                    key={candidate.id}
                    className={cn(
                      "group w-full transition-all duration-200",
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
                      recruiters={recruiters}
                    />
                  </div>
                )) : (
                  <div className={cn(
                    "flex items-center justify-center h-16 border-2 border-dashed rounded-lg transition-all duration-200",
                    dragOverColumn === 'uncategorized' && dragOverRow === 'none' 
                      ? "border-primary bg-primary/5" 
                      : "border-muted"
                  )}>
                    <div className="text-center">
                      <Plus className={cn(
                        "w-4 h-4 mx-auto mb-1 transition-colors duration-200",
                        dragOverColumn === 'uncategorized' && dragOverRow === 'none' ? "text-primary" : "text-muted-foreground"
                      )} />
                      <p className={cn(
                        "text-xs transition-colors duration-200",
                        dragOverColumn === 'uncategorized' && dragOverRow === 'none' ? "text-primary font-medium" : "text-muted-foreground"
                      )}>
                        {dragOverColumn === 'uncategorized' && dragOverRow === 'none' ? "Drop here" : "Drop here"}
                      </p>
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
                recruiters={recruiters}
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
        const rowValue = getFieldValue(candidate, rowField);
        const colVal = getFieldValue(candidate, columnField);
        return colVal === colValue && !rowValuesToShow.includes(rowValue);
      });
    });
    // Find candidates that do not match any column value
    const uncategorizedColCandidates = candidates.filter(candidate => {
      const colVal = getFieldValue(candidate, columnField);
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
                    getFieldValue(candidate, rowField) === rowValue &&
                    getFieldValue(candidate, columnField) === colValue
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
                                  recruiters={recruiters}
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
                            recruiters={recruiters}
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
                                recruiters={recruiters}
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

  // --- NEW LOGIC: If only one column, show horizontal layout with navigation ---
  if (isColumnBased && effectiveColumnValues.length === 1) {
    const colValue = effectiveColumnValues[0];
    const colCandidates = candidates.filter(c => {
      const value = c[columnField as keyof typeof c] ?? c.customAttributes?.[columnField];
      return value === colValue;
    });
    return (
      <div className="w-full h-[calc(100vh-200px)] bg-muted/30 rounded-lg p-4 flex flex-col items-center justify-center overflow-y-auto">
        <SingleRowCandidateView
          candidates={colCandidates}
          onCardClick={onCardClick}
          onMoveCandidate={onMoveCandidate}
          visibleFields={visibleFields}
          recruiters={recruiters}
        />
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
                        recruiters={recruiters}
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
// Shows multiple candidate cards horizontally with scroll navigation (like job matches)
export function SingleRowCandidateView({ 
  candidates, 
  onCardClick, 
  onMoveCandidate, 
  visibleFields = ['name', 'email', 'status', 'fitScore'],
  recruiters
}: { 
  candidates: Candidate[];
  onCardClick?: (candidate: Candidate) => void;
  onMoveCandidate?: (candidate: Candidate, newValue: string) => void;
  visibleFields?: string[];
  recruiters?: UserProfile[];
}) {
  const [scrollPosition, setScrollPosition] = useState(0);

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
    <div className="relative w-full">
             {/* Left Navigation Button */}
       {candidates.length > 1 && (
         <Button
           type="button"
           variant="outline"
           size="icon"
           className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const container = document.querySelector('.candidates-horizontal-container');
            if (container) {
              container.scrollBy({ left: -280, behavior: 'smooth' });
              // Update scroll position after animation with proper cleanup
              if (scrollLeftTimeoutRef.current) {
                clearTimeout(scrollLeftTimeoutRef.current);
              }
              scrollLeftTimeoutRef.current = setTimeout(() => {
                setScrollPosition(container.scrollLeft);
                scrollLeftTimeoutRef.current = null;
              }, 300);
            }
          }}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

             {/* Right Navigation Button */}
       {candidates.length > 1 && (
         <Button
           type="button"
           variant="outline"
           size="icon"
           className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const container = document.querySelector('.candidates-horizontal-container');
            if (container) {
              container.scrollBy({ left: 280, behavior: 'smooth' });
              // Update scroll position after animation with proper cleanup
              if (scrollRightTimeoutRef.current) {
                clearTimeout(scrollRightTimeoutRef.current);
              }
              scrollRightTimeoutRef.current = setTimeout(() => {
                setScrollPosition(container.scrollLeft);
                scrollRightTimeoutRef.current = null;
              }, 300);
            }
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Horizontal Scrollable Container */}
      <div
        className="flex flex-row overflow-x-auto gap-3 pb-2 candidates-horizontal-container scrollbar-hide"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
        onScroll={(e) => {
          const target = e.target as HTMLElement;
          setScrollPosition(target.scrollLeft);
        }}
      >
        {candidates.map((candidate, index) => (
          <Card 
            key={`candidate-${candidate.id}-${index}`} 
            className="flex-shrink-0 w-80 p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer bg-card"
            onClick={() => onCardClick?.(candidate)}
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12 flex-shrink-0">
                <AvatarImage 
                  src={candidate.avatarUrl || `https://placehold.co/48x48.png?text=${formatCandidateName(candidate)?.charAt(0) || 'C'}`} 
                  alt={formatCandidateName(candidate)} 
                />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {formatCandidateName(candidate)?.charAt(0)?.toUpperCase() || 'C'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 space-y-2">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground truncate" title={formatCandidateName(candidate)}>
                      {formatCandidateName(candidate)}
                    </p>
                    {visibleFields.includes('positionId') && (
                      <p className="text-xs text-muted-foreground truncate" title={candidate.position?.title || 'N/A'}>
                        <Target className="w-3 h-3 inline mr-1" />
                        {candidate.position?.title || 'N/A'}
                      </p>
                    )}
                  </div>
                  {/* Status Badge */}
                  <Badge className={cn(
                    "text-xs px-2 py-1 flex-shrink-0",
                    getStatusColor(candidate.status)
                  )}>
                    {candidate.status || 'Unknown'}
                  </Badge>
                </div>

                {/* Contact Information */}
                <div className="space-y-1">
                  {visibleFields.includes('email') && candidate.email && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{candidate.email}</span>
                    </div>
                  )}
                  {visibleFields.includes('phone') && candidate.phone && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Phone className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{candidate.phone}</span>
                    </div>
                  )}
                  {visibleFields.includes('applicationDate') && candidate.applicationDate && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span>Applied: {new Date(candidate.applicationDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {visibleFields.includes('recruiterId') && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <User className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{candidate.recruiter?.name || candidate.recruiterId || 'Unassigned'}</span>
                    </div>
                  )}
                </div>

                {/* Fit Score */}
                {visibleFields.includes('fitScore') && candidate.fitScore !== undefined && candidate.fitScore !== null && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{getFieldLabel('fitScore')}</span>
                      <span className="font-medium text-foreground">
                        {candidate.fitScore === null || candidate.fitScore === undefined ? 'Not scored' : formatScoreWithGrade(candidate.fitScore)}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={cn("h-2 rounded-full transition-all duration-300", getScoreBgColor(candidate.fitScore))}
                        style={{ width: `${normalizeFitScore(candidate.fitScore)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCardClick?.(candidate);
                    }}
                    className="flex items-center gap-1 h-7 px-2 text-xs"
                  >
                    <Eye className="w-3 h-3" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="flex items-center gap-1 h-7 px-2 text-xs"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Candidates count indicator */}
      {candidates.length > 1 && (
        <div className="flex justify-center mt-2">
          <Badge variant="secondary" className="text-xs">
            {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
            {candidates.length > 3 && (
              <span className="ml-1 text-blue-600">← Scroll →</span>
            )}
          </Badge>
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
  visibleColumnValues = [],
  isLoading = false
}: CandidateKanbanViewProps & { visibleFields?: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCandidateSummary, setSelectedCandidateSummary] = useState<Partial<Candidate> & { id: string; name: string } | null>(null);

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-full min-h-[300px] bg-muted/30 rounded-lg p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-muted rounded-full flex items-center justify-center animate-pulse">
            <Users className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-lg text-muted-foreground">Loading candidates...</p>
        </div>
      </div>
    );
  }

  // Helper function to get the proper value for a field
  const getFieldValue = (candidate: Candidate, field: string) => {
    if (field === 'recruiterId') {
      return candidate.recruiter?.name || 'Unassigned';
    }
    if (field === 'positionId') {
      return candidate.position?.title || candidate.positionId || 'No Position';
    }
    return candidate[field as keyof typeof candidate] ?? candidate.customAttributes?.[field];
  };

  // Filter candidates to only show those that match the current row/column configuration
  const filteredCandidates = useMemo(() => {
    return candidates.filter(candidate => {
      const rowValue = getFieldValue(candidate, rowField);
      const colValue = columnField && columnField !== 'none' 
        ? getFieldValue(candidate, columnField)
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
        <div className="w-full h-[calc(100vh-200px)] p-4 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
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
                 size="icon"
                 onClick={handlePrevious}
                 disabled={filteredCandidates.length <= 1}
                 className="h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
               >
                 <ChevronLeft className="w-4 h-4" />
               </Button>
               <Button
                 variant="outline"
                 size="icon"
                 onClick={handleNext}
                 disabled={filteredCandidates.length <= 1}
                 className="h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
               >
                 <ChevronRight className="w-4 h-4" />
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
                          {currentCandidate.fitScore === null || currentCandidate.fitScore === undefined ? 'Not scored' : formatScoreWithGrade(currentCandidate.fitScore)}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div 
                          className={cn("h-3 rounded-full transition-all duration-300", getScoreBgColor(currentCandidate.fitScore))}
                          style={{ width: `${normalizeFitScore(currentCandidate.fitScore)}%` }}
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
        <FullCandidateDetail 
          candidateId={selectedCandidateSummary.id} 
          isModal={true} 
          onClose={() => setIsModalOpen(false)} 
          comments={[]} 
          resumes={[]} 
          onRefresh={() => {}} 
        />
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
                <RecruiterAvatarCompact
                  user={{
                    id: recruiter.id,
                    name: recruiter.name,
                    avatarUrl: recruiter.avatarUrl,
                    personalColor: recruiter.personalColor
                  }}
                  size="md"
                />
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
                                  <CandidateAvatar 
                                    user={candidate}
                                    size="sm"
                                    className="h-6 w-6 flex-shrink-0"
                                  />
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
                                      <span className="font-medium text-foreground">
                                        {candidate.fitScore === null || candidate.fitScore === undefined ? 'Not scored' : formatScoreWithGrade(candidate.fitScore)}
                                      </span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-1">
                                      <div 
                                        className={cn("h-1 rounded-full transition-all duration-300", getScoreBgColor(candidate.fitScore))}
                                        style={{ width: `${normalizeFitScore(candidate.fitScore)}%` }}
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

// New Horizontal Stage Kanban View for recruitment stages as columns
export function HorizontalStageKanbanView({ 
  candidates, 
  statuses, 
  recruiters,
  onMoveCandidate, 
  onCardClick, 
  rowField = 'status',
  columnField = 'none',
  visibleFields = ['name', 'email', 'status', 'fitScore'],
  visibleRowValues = [],
  visibleColumnValues = []
}: CandidateKanbanViewProps) {
  const [draggedCandidate, setDraggedCandidate] = useState<Candidate | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Determine what to show as columns based on columnField
  const getColumnValue = (candidate: Candidate) => {
    if (columnField === 'none') return 'All Candidates';
    if (columnField === 'status') return candidate.status;
    if (columnField === 'recruiterId') {
      // For recruiterId, we need to match against recruiter names, not IDs
      // If the candidate has a recruiter object with a name, use that
      if (candidate.recruiter?.name) {
        return candidate.recruiter.name;
      }
      // If no recruiter name but has recruiterId, we need to find the recruiter name
      // This should be handled by the API, but as a fallback, return 'Unassigned'
      return 'Unassigned';
    }
    if (columnField === 'positionId') return candidate.position?.title || candidate.positionId || 'No Position';
    if (columnField === 'fitScore') {
      if (candidate.fitScore === null || candidate.fitScore === undefined) return 'No Score';
      const gradeInfo = getScoreGradeInfo(candidate.fitScore);
      if (gradeInfo) {
        return `${gradeInfo.letter} (${gradeInfo.range})`;
      }
      return 'No Score';
    }
    // Check custom attributes
    if (candidate.customAttributes && candidate.customAttributes[columnField]) {
      return candidate.customAttributes[columnField];
    }
    // Check parsed data
    const parsedValue = getParsedDataProperty(candidate, columnField);
    if (parsedValue) return parsedValue;
    
    return 'Unknown';
  };

  // Use visibleColumnValues if provided, otherwise use all unique column values
  const columnsToShow = visibleColumnValues.length > 0 
    ? visibleColumnValues 
    : Array.from(new Set(candidates.map(getColumnValue))).filter(Boolean);

  // Group candidates by column value
  const candidatesByColumn = useMemo(() => {
    const grouped: Record<string, Candidate[]> = {};
    
    // Initialize all columns with empty arrays
    columnsToShow.forEach(column => {
      grouped[column] = [];
    });
    
    // Group candidates by their column value
    candidates.forEach(candidate => {
      const columnValue = getColumnValue(candidate);
      if (columnValue && columnsToShow.includes(columnValue)) {
        if (!grouped[columnValue]) {
          grouped[columnValue] = [];
        }
        grouped[columnValue].push(candidate);
      }
    });
    
    return grouped;
  }, [candidates, columnsToShow, columnField]);

  // Enhanced drag and drop handlers
  const handleDragStart = (candidate: Candidate) => {
    // Only allow dragging for status columns
    if (columnField === 'status') {
      setDraggedCandidate(candidate);
      setIsDragging(true);
      // Add a small delay to prevent immediate drag end with proper cleanup
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
      dragTimeoutRef.current = setTimeout(() => {
        if (isDragging) {
          document.body.style.cursor = 'grabbing';
        }
        dragTimeoutRef.current = null;
      }, 50);
    } else {
      // For non-status columns, prevent dragging
      toast('Drag and drop is only supported for status columns');
    }
  };

  const handleDragEnd = () => {
    setDraggedCandidate(null);
    setDragOverStage(null);
    setIsDragging(false);
    document.body.style.cursor = '';
  };

  const handleDragOver = (column: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only allow dropping if we're dragging a candidate, it's not the same column, and it's a status column
    if (draggedCandidate && getColumnValue(draggedCandidate) !== column && columnField === 'status') {
      setDragOverStage(column);
      e.dataTransfer.dropEffect = 'move';
    } else if (draggedCandidate && columnField !== 'status') {
      // For non-status columns, show that drag and drop is not supported
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleDragLeave = (column: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we're actually leaving the drop zone
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverStage(null);
    }
  };

  const handleDrop = (column: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedCandidate && getColumnValue(draggedCandidate) !== column) {
      // Only allow drag and drop for status-based columns
      if (columnField === 'status') {
        onMoveCandidate?.(draggedCandidate, column);
      } else {
        // For non-status columns, show a warning that drag and drop is not supported
        toast?.('Drag and drop is only supported for status columns');
      }
    }
    setDraggedCandidate(null);
    setDragOverStage(null);
    setIsDragging(false);
    document.body.style.cursor = '';
  };

  const handleCardClick = (candidate: Candidate) => {
    if (onCardClick) {
      onCardClick(candidate);
    }
  };

  // Add refs for timeout cleanup to prevent resource leaks
  const scrollLeftTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Navigation handlers
  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollAmount = Math.min(400, container.scrollLeft);
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const maxScroll = container.scrollWidth - container.clientWidth;
      const scrollAmount = Math.min(400, maxScroll - container.scrollLeft);
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Cleanup timeouts on unmount to prevent resource leaks
  useEffect(() => {
    return () => {
      if (scrollLeftTimeoutRef.current) {
        clearTimeout(scrollLeftTimeoutRef.current);
        scrollLeftTimeoutRef.current = null;
      }
      if (scrollRightTimeoutRef.current) {
        clearTimeout(scrollRightTimeoutRef.current);
        scrollRightTimeoutRef.current = null;
      }
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = null;
      }
    };
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    setScrollPosition(target.scrollLeft);
  };

  // Check if scroll buttons should be shown
  const showScrollButtons = columnsToShow.length > 2;

  return (
    <div className="w-full h-[calc(100vh-200px)] bg-muted/30 rounded-lg p-4">
      {/* Navigation Controls */}
      {showScrollButtons && (
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={handleScrollLeft}
            className="h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
            disabled={scrollPosition <= 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {columnsToShow.length} columns
            </span>
            <Badge variant="secondary" className="text-xs">
              {candidates.length} candidates
            </Badge>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleScrollRight}
            className="h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Horizontal Scrollable Container */}
      <div className="relative">
                 {/* Left Scroll Button */}
         {showScrollButtons && scrollPosition > 0 && (
           <Button
             variant="outline"
             size="icon"
             className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-lg"
             onClick={handleScrollLeft}
           >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

                 {/* Right Scroll Button */}
         {showScrollButtons && (
           <Button
             variant="outline"
             size="icon"
             className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-lg"
             onClick={handleScrollRight}
           >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {/* Scrollable Columns Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
          onScroll={handleScroll}
        >
          {columnsToShow.map((column) => {
            const columnCandidates = candidatesByColumn[column] || [];
            const isDragOver = dragOverStage === column;
            const isCurrentColumn = draggedCandidate && getColumnValue(draggedCandidate) === column;
            
            return (
              <div
                key={column}
                className="flex-shrink-0 w-80"
                style={{ minWidth: '320px' }}
              >
                <Card className={cn(
                  "flex flex-col h-full shadow-sm border border-border bg-card transition-all duration-200",
                  isDragOver && !isCurrentColumn && "ring-2 ring-primary ring-opacity-50 bg-primary/5",
                  isCurrentColumn && isDragging && "opacity-50"
                )}>
                  <CardHeader className="p-4 border-b border-border sticky top-0 bg-card z-10 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-3 h-3 rounded-full transition-colors duration-200",
                          isDragOver && !isCurrentColumn ? "bg-primary" : "bg-primary"
                        )}></div>
                        <div>
                          <CardTitle className="text-sm font-semibold text-foreground capitalize">
                            {column}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {columnField === 'status' ? 'Recruitment Stage' : 
                             columnField === 'recruiterId' ? 'Recruiter' :
                             columnField === 'positionId' ? 'Position' :
                             columnField === 'fitScore' ? 'Fit Score Range' :
                             'Custom Field'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {columnCandidates.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <div 
                    className={cn(
                      "flex-1 min-h-0 p-4 space-y-3 transition-all duration-200 relative",
                      isDragOver && !isCurrentColumn && "bg-primary/5"
                    )}
                    onDragOver={(e) => handleDragOver(column, e)}
                    onDragLeave={(e) => handleDragLeave(column, e)}
                    onDrop={(e) => handleDrop(column, e)}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      if (draggedCandidate && getColumnValue(draggedCandidate) !== column) {
                        setDragOverStage(column);
                      }
                    }}
                  >
                    {/* Drop zone indicator */}
                    {isDragOver && !isCurrentColumn && (
                      <div className="absolute inset-0 border-2 border-dashed border-primary/50 bg-primary/5 rounded-lg pointer-events-none z-10 flex items-center justify-center">
                        <div className="text-center">
                          <Plus className="w-8 h-8 mx-auto mb-2 text-primary" />
                          <p className="text-sm font-medium text-primary">Drop here</p>
                          <p className="text-xs text-primary/70">Move to {column}</p>
                        </div>
                      </div>
                    )}
                    
                    {columnCandidates.length > 0 ? (
                      <div className="space-y-3">
                        {columnCandidates.map(candidate => (
                          <div
                            key={candidate.id}
                            className={cn(
                              "group w-full transition-all duration-200",
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
                              columnField={columnField}
                              recruiters={recruiters}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={cn(
                        "flex items-center justify-center h-32 border-2 border-dashed rounded-lg transition-all duration-200",
                        isDragOver && !isCurrentColumn 
                          ? "border-primary bg-primary/5" 
                          : "border-muted"
                      )}>
                        <div className="text-center">
                          <Plus className={cn(
                            "w-6 h-6 mx-auto mb-2 transition-colors duration-200",
                            isDragOver && !isCurrentColumn ? "text-primary" : "text-muted-foreground"
                          )} />
                          <p className={cn(
                            "text-sm transition-colors duration-200",
                            isDragOver && !isCurrentColumn ? "text-primary font-medium" : "text-muted-foreground"
                          )}>
                            {isDragOver && !isCurrentColumn ? "Drop here" : "Drop candidates here"}
                          </p>
                          <p className="text-xs text-muted-foreground/60 mt-1">
                            {column} {columnField === 'status' ? 'stage' : 'column'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scroll Progress Indicator */}
      {showScrollButtons && (
        <div className="flex justify-center mt-4">
          <div className="flex gap-1">
            {columnsToShow.map((_, index) => {
              const container = scrollContainerRef.current;
              if (!container) return null;
              
              const columnWidth = 320 + 16; // card width + gap
              const isActive = scrollPosition >= index * columnWidth && scrollPosition < (index + 1) * columnWidth;
              
              return (
                <div
                  key={index}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-200",
                    isActive ? "bg-primary" : "bg-muted"
                  )}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
