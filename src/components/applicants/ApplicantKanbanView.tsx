// src/components/Applicants/ApplicantKanbanView.tsx
"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Applicant, ApplicantStatus, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ApplicantAvatar } from '@/components/ui/applicant-avatar';
import { RecruiterAvatarCompact } from '@/components/ui/recruiter-avatar';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ApplicantDetailModal from './ApplicantDetailModal';
import FullApplicantDetail from './FullApplicantDetail';
import { BlacklistBadge } from './BlacklistBadge';
import { PencilIcon as Pencil, TrashIcon as Trash2, ArrowRightIcon as MoveRight, PlusIcon as Plus, CalendarIcon as Calendar, FlagIcon as Target, UserIcon as User, EnvelopeIcon as Mail, PhoneIcon as Phone, ClockIcon as Clock, ArrowTrendingUpIcon as TrendingUp, ChevronLeftIcon as ChevronRight, ChevronRightIcon as ChevronLeft, EyeIcon as Eye, UsersIcon as Users, AcademicCapIcon as GraduationCap, BriefcaseIcon as Briefcase, CircleStackIcon as HardDrive, NoSymbolIcon as Ban } from '@heroicons/react/24/outline';
import { formatScoreWithGrade, getScoreColor, getScoreBgColor, normalizeFitScore, getScoreGradeInfo } from "@/lib/scoreUtils";
import { formatApplicantName, formatApplicantNameWithLang } from "@/lib/applicantUtils";
import { getApplicantPersonalColor, getApplicantCardStyles } from "@/lib/personalColorUtils";
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { getErrorMessage } from '@/lib/networkUtils';
import { convertMinIOUrlToSecureUrl } from '@/lib/imageUtils';
import { SkeletonKanbanCard } from '@/components/ui/loading-overlay';
import { useIsMobile } from '@/hooks/use-mobile';



// Helper function to extract parsed data properties (similar to FullApplicantDetail)
const getParsedDataProperty = (applicant: Applicant, propertyName: string) => {
  const parsedData = applicant.parsedData;
  if (!parsedData || typeof parsedData !== 'object') return undefined;

  // Check for new applicant_info structure
  if ('applicant_info' in parsedData && parsedData.applicant_info && typeof parsedData.applicant_info === 'object') {
    return (parsedData.applicant_info as any)[propertyName];
  }

  // Check for direct property
  if (propertyName in parsedData) {
    return (parsedData as any)[propertyName];
  }

  return undefined;
};

// Renders a status badge showing the human-readable stage name for a given stage ID
export function StatusBadge({
  status,
  statusId,
  className = '',
  stageNames = {},
  stageColors = {}
}: {
  status?: string | null;
  statusId?: string | null;
  className?: string;
  stageNames?: Record<string, string>;
  stageColors?: Record<string, string>;
}) {
  const [stageName, setStageName] = React.useState<string | null>(null);
  const [colorClass, setColorClass] = React.useState<string>('bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800');
  const [localStageColors, setLocalStageColors] = React.useState<Record<string, string>>(stageColors);

  // Fetch stage colors if not provided
  React.useEffect(() => {
    const statusToUse = statusId || status;
    if (Object.keys(stageColors).length === 0 && statusToUse) {
      const fetchStageColor = async () => {
        try {
          const response = await fetch(`/api/settings/recruitment-stages?ids=${statusToUse}`);
          if (response.ok) {
            const stages = await response.json();
            const stage = stages.find((s: any) => s.id === statusToUse);
            if (stage?.color_badge) {
              setLocalStageColors({ [statusToUse]: stage.color_badge });
            }
          }
        } catch (error) {
          console.error('Error fetching stage color:', error);
        }
      };
      fetchStageColor();
    } else {
      setLocalStageColors(stageColors);
    }
  }, [status, statusId, stageColors]);

  useEffect(() => {
    const statusToUse = statusId || status;
    if (!statusToUse) {
      setStageName(null);
      return;
    }

    // Use stage names from props
    if (stageNames && stageNames[statusToUse]) {
      setStageName(stageNames[statusToUse]);
    } else {
      setStageName(null);
    }
  }, [status, statusId, stageNames]);

  useEffect(() => {
    const statusToUse = statusId || status;
    if (statusToUse && localStageColors[statusToUse]) {
      // Use the color from the database
      const stageColor = localStageColors[statusToUse];
      // Convert hex color to appropriate Tailwind classes
      const colorClass = `bg-[${stageColor}]/10 text-[${stageColor}] border-[${stageColor}]/20 dark:bg-[${stageColor}]/20 dark:text-[${stageColor}] dark:border-[${stageColor}]/40`;
      setColorClass(colorClass);
    } else if (stageName) {
      // Fallback to hardcoded colors if no database color is found
      const lowerStageName = stageName.toLowerCase();
      if (lowerStageName.includes('hired') || lowerStageName.includes('offer accepted')) {
        setColorClass('bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800');
      } else if (lowerStageName.includes('rejected') || lowerStageName.includes('withdrawn')) {
        setColorClass('bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800');
      } else if (lowerStageName.includes('interview')) {
        setColorClass('bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800');
      } else if (lowerStageName.includes('offer extended')) {
        setColorClass('bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800');
      } else if (lowerStageName.includes('shortlisted')) {
        setColorClass('bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800');
      } else if (lowerStageName.includes('screening')) {
        setColorClass('bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800');
      } else if (lowerStageName.includes('on hold')) {
        setColorClass('bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800');
      } else {
        setColorClass('bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800');
      }
    } else {
      setColorClass('bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800');
    }
  }, [status, statusId, stageName, localStageColors]);

  return (
    <Badge className={cn("text-xs px-2 py-1 flex-shrink-0", className, colorClass)}>
      {stageName || status || statusId || 'Unknown'}
    </Badge>
  );
}

// Helper function to get education data
const getEducation = (applicant: Applicant) => {
  if (!applicant) return [];

  let educationArray: any[] = [];

  if (Array.isArray(applicant.educationData) && applicant.educationData.length > 0) {
    educationArray = applicant.educationData;
  } else {
    const parsedData = applicant.parsedData;
    if (parsedData && typeof parsedData === 'object') {
      // Check for new applicant_info structure
      if ('applicant_info' in parsedData && parsedData.applicant_info && typeof parsedData.applicant_info === 'object') {
        const education = (parsedData.applicant_info as any).education;
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
const getExperience = (applicant: Applicant) => {
  if (!applicant) return [];

  let experienceArray: any[] = [];

  if (Array.isArray(applicant.experienceData) && applicant.experienceData.length > 0) {
    experienceArray = applicant.experienceData;
  } else {
    const parsedData = applicant.parsedData;
    if (parsedData && typeof parsedData === 'object') {
      // Check for new applicant_info structure
      if ('applicant_info' in parsedData && parsedData.applicant_info && typeof parsedData.applicant_info === 'object') {
        const experience = (parsedData.applicant_info as any).experience;
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
const getSkills = (applicant: Applicant) => {
  return getParsedDataProperty(applicant, 'skills') || [];
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

// Enhanced Applicant card component
const EnhancedApplicantCard = ({ applicant, isDragged = false, onClick, onDragStart, onDragEnd, visibleFields = ['name', 'email', 'status', 'fitScore'], columnField = 'status', recruiters }: {
  applicant: Applicant;
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

  // Cleanup timeout on component unmount - MUST be called before any early returns
  useEffect(() => {
    return () => {
      if (dragImageTimeoutRef.current) {
        clearTimeout(dragImageTimeoutRef.current);
      }
    };
  }, []);

  // Validate Applicant data - must happen after all hooks
  if (!applicant || !applicant.id) {
    return (
      <Card className="p-4 border border-destructive/20 bg-destructive/5">
        <div className="text-center text-destructive text-sm">
          Invalid Applicant data
        </div>
      </Card>
    );
  }

  const education = getEducation(applicant);
  const experience = getExperience(applicant);
  const skills = getSkills(applicant);
  const personalInfo = getParsedDataProperty(applicant, 'personal_info');
  const contactInfo = getParsedDataProperty(applicant, 'contact_info');
  const personalColor = getApplicantPersonalColor(applicant, recruiters);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragStarting(true);
    onDragStart();

    // Set drag image and data
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', applicant.id);
      e.dataTransfer.setData('application/json', JSON.stringify(applicant));

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

  // Check if mobile (for border removal)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <Card
      className={cn(
        "w-full p-4 hover:shadow-md transition-all duration-200 bg-card border border-border flex flex-col gap-3 relative",
        columnField === 'status' ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        isDragged && "opacity-60 scale-95 shadow-lg",
        isDragStarting && "scale-105 shadow-xl",
        isMobile && "border-0"
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
        const nameInfo = formatApplicantNameWithLang(applicant);
        return (
          <div className="flex items-start gap-3">
            <ApplicantAvatar
              user={applicant}
              size="md"
              className="h-10 w-10 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm font-semibold truncate flex items-center gap-1",
                  nameInfo.fontClass,
                  applicant.isBlacklisted ? "text-destructive" : "text-foreground"
                )}
                title={nameInfo.name}
                lang={nameInfo.lang}
              >
                {nameInfo.name}
                {applicant.isBlacklisted && <BlacklistBadge className="px-1.5 py-0" iconClassName="h-2.5 w-2.5" />}
              </p>
              {visibleFields.includes('positionId') && (
                <p className="text-xs text-muted-foreground truncate mt-1" title={applicant.position?.title || 'N/A'}>
                  <Target className="w-3 h-3 inline mr-1" />
                  {applicant.position?.title || 'N/A'}
                </p>
              )}
            </div>
          </div>
        );
      })()}
      <div className="space-y-2">
        {visibleFields.includes('fitScore') && applicant.fitScore !== undefined && applicant.fitScore !== null && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{getFieldLabel('fitScore')}</span>
              <span className="font-medium text-foreground">
                {applicant.fitScore === null || applicant.fitScore === undefined ? 'Not scored' : formatScoreWithGrade(applicant.fitScore)}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={cn("h-2 rounded-full transition-all duration-300", getScoreBgColor(applicant.fitScore))}
                style={{ width: `${normalizeFitScore(applicant.fitScore)}%` }}
              ></div>
            </div>
          </div>
        )}
        {/* Contact Information */}
        {(visibleFields.includes('email') || visibleFields.includes('phone') || visibleFields.includes('applicationDate')) && (
          <div className="space-y-1">
            {visibleFields.includes('email') && applicant.email && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Mail className="w-3 h-3 mr-1" />
                <span className="truncate">{applicant.email}</span>
              </div>
            )}
            {visibleFields.includes('phone') && applicant.phone && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Phone className="w-3 h-3 mr-1" />
                <span className="truncate">{applicant.phone}</span>
              </div>
            )}
            {visibleFields.includes('applicationDate') && applicant.applicationDate && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Calendar className="w-3 h-3 mr-1" />
                Applied: {new Date(applicant.applicationDate).toLocaleDateString()}
              </div>
            )}
            {visibleFields.includes('recruiterId') && (
              <div className="flex items-center text-xs text-muted-foreground">
                <User className="w-3 h-3 mr-1" />
                <span>{applicant.recruiter?.name || applicant.recruiterId || 'Unassigned'}</span>
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

interface ApplicantKanbanViewProps {
  applicants: Applicant[];
  statuses: ApplicantStatus[];
  recruiters?: UserProfile[];
  onMoveApplicant?: (applicant: Applicant, newValue: string) => void;
  onCardClick?: (applicant: Applicant) => void;
  showAddButton?: boolean;
  rowField?: string;
  columnField?: string;
  visibleFields?: string[];
  visibleRowValues?: string[];
  visibleColumnValues?: string[];
  isLoading?: boolean;
}

export function ApplicantKanbanView({
  applicants,
  statuses,
  recruiters,
  onMoveApplicant,
  onCardClick,
  showAddButton = true,
  rowField = 'status',
  columnField = 'none',
  visibleFields = ['name', 'email', 'status', 'fitScore'],
  visibleRowValues = [],
  visibleColumnValues = [],
  isLoading = false,
}: ApplicantKanbanViewProps) {
  // Show loading state with skeleton cards
  if (isLoading) {
    return (
      <div className="w-full min-h-[300px] p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-fade-in">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonKanbanCard key={`skeleton-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  // If there are no applicants at all
  if (applicants.length === 0) {
    return (
      <div className="w-full min-h-[300px] p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center">
            <Plus className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-lg text-muted-foreground">No applicants found</p>
        </div>
      </div>
    );
  }

  // Delegate to FlexibleKanbanView with all customization props
  return (
    <FlexibleKanbanView
      applicants={applicants}
      statuses={statuses}
      recruiters={recruiters}
      onMoveApplicant={onMoveApplicant}
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

// Enhanced Row-based Kanban (stages as rows, Applicants as draggable cards)
export function ApplicantRowKanbanView({
  applicants,
  statuses,
  recruiters,
  onMoveApplicant,
  onCardClick,
  rowField = 'status',
  columnField = 'recruiterId',
  visibleFields = ['name', 'email', 'status', 'fitScore'],
  visibleRowValues = [],
  visibleColumnValues = [],
  isLoading = false
}: ApplicantKanbanViewProps) {
  const [draggedApplicant, setDraggedApplicant] = useState<Applicant | null>(null);
  const [dragOverRowValue, setDragOverRowValue] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApplicantSummary, setSelectedApplicantSummary] = useState<Partial<Applicant> & { id: string; name: string } | null>(null);

  // Group applicants by row field value - MUST be called before any early returns
  const applicantsByRowValue = useMemo(() => {
    const grouped: Record<string, Applicant[]> = {};

    // Initialize all visible row values with empty arrays
    visibleRowValues.forEach(rowValue => {
      grouped[rowValue] = [];
    });

    // Group applicants by their row field value
    applicants.forEach(applicant => {
      const rowValue = applicant[rowField as keyof Applicant] as string;
      if (rowValue && visibleRowValues.includes(rowValue)) {
        if (!grouped[rowValue]) {
          grouped[rowValue] = [];
        }
        grouped[rowValue].push(applicant);
      }
    });

    return grouped;
  }, [applicants, rowField, visibleRowValues]);

  // Only show rows in visibleRowValues (if provided)
  const filteredRowValues = visibleRowValues && visibleRowValues.length > 0
    ? visibleRowValues
    : statuses; // Fallback to statuses for backward compatibility

  // Drag and drop handlers
  const handleDragStart = (applicant: Applicant) => {
    setDraggedApplicant(applicant);
  };
  const handleDragEnd = () => {
    setDraggedApplicant(null);
    setDragOverRowValue(null);
  };
  const handleDragOver = (rowValue: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverRowValue(rowValue);
  };
  const persistApplicantFieldUpdate = async (applicant: Applicant, field: string, value: any) => {
    try {
      if (field === 'status') {
        toast.loading('Updating Applicant status...', { id: applicant.id });
        const res = await fetch('/api/applicants/bulk-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'change_status',
            applicantIds: [applicant.id],
            newStatus: value
          })
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 403) {
            throw new Error('Permission denied: You do not have permission to update Applicant status. Please contact your administrator.');
          }
          throw new Error(data.message || `Failed to update Applicant status: HTTP ${res.status}`);
        }

        const result = await res.json();

        // Check for rejected applicants due to headcount constraints
        if (result.rejectedApplicants && result.rejectedApplicants.length > 0) {
          const rejectedApplicant = result.rejectedApplicants.find((c: any) => c.applicantId === applicant.id);
          if (rejectedApplicant) {
            throw new Error(`Headcount constraint: ${rejectedApplicant.message}`);
          }
        }

        toast.success(`Status updated to ${value}`, { id: applicant.id });
      } else if (field === 'recruiterId' || field === 'positionId') {
        toast.loading('Updating Applicant...', { id: applicant.id });
        const res = await fetch(`/api/applicants/${applicant.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value })
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to update Applicant');
        }
        toast.success('Applicant updated', { id: applicant.id });
      }
    } catch (error: any) {
      // Check if it's a headcount constraint error
      if (error.message && error.message.includes('Headcount constraint:')) {
        // For headcount constraint errors, we need to show a more detailed error
        // since we don't have access to the HeadcountWarningModal here
        toast.error(error.message, { duration: 8000 });
      } else {
        toast.error(getErrorMessage(error), { id: applicant.id });
      }
    }
  };

  const handleDrop = async (rowValue: string) => {
    if (draggedApplicant && draggedApplicant[rowField as keyof Applicant] !== rowValue) {
      // Create update object with the new row field value
      const updateData: any = {};
      updateData[rowField] = rowValue;
      if (onMoveApplicant) {
        onMoveApplicant(draggedApplicant, rowValue);
      } else {
        await persistApplicantFieldUpdate(draggedApplicant, rowField, rowValue);
      }
    }
    setDraggedApplicant(null);
    setDragOverRowValue(null);
  };

  const handleCardClick = (applicant: Applicant) => {
    if (onCardClick) {
      onCardClick(applicant);
    } else {
      // Validate parsedData to ensure it has the expected structure
      const validatedParsedData = applicant.parsedData && typeof applicant.parsedData === 'object' ? {
        ...applicant.parsedData,
        // Ensure array fields are actually arrays
        job_matches: 'job_matches' in applicant.parsedData && Array.isArray((applicant.parsedData as any).job_matches) ? (applicant.parsedData as any).job_matches : [],
        education: 'education' in applicant.parsedData && Array.isArray((applicant.parsedData as any).education) ? (applicant.parsedData as any).education : [],
        experience: 'experience' in applicant.parsedData && Array.isArray((applicant.parsedData as any).experience) ? (applicant.parsedData as any).experience : [],
        skills: 'skills' in applicant.parsedData && Array.isArray((applicant.parsedData as any).skills) ? (applicant.parsedData as any).skills : [],
        job_suitable: 'job_suitable' in applicant.parsedData && Array.isArray((applicant.parsedData as any).job_suitable) ? (applicant.parsedData as any).job_suitable : [],
      } : {};

      setSelectedApplicantSummary({
        id: applicant.id,
        name: formatApplicantName(applicant),
        email: applicant.email,
        phone: applicant.phone,
        status: applicant.statusId,
        position: applicant.position,
        fitScore: applicant.fitScore,
        parsedData: validatedParsedData
      });
      setIsModalOpen(true);
    }
  };

  return (
    <div>Test</div>
  );
}

// Flexible Kanban View that supports both row-based and column-based layouts
export function FlexibleKanbanView({
  applicants,
  statuses,
  recruiters,
  onMoveApplicant,
  onCardClick,
  rowField = 'status',
  columnField = 'recruiterId',
  visibleFields = ['name', 'email', 'status', 'fitScore'],
  visibleRowValues = [],
  visibleColumnValues = [],
  isLoading = false
}: ApplicantKanbanViewProps) {
  const [draggedApplicant, setDraggedApplicant] = useState<Applicant | null>(null);
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
          <p className="text-lg text-muted-foreground">Loading applicants...</p>
        </div>
      </div>
    );
  }

  // Helper function to get the proper value for a field
  const getFieldValue = (applicant: Applicant, field: string) => {
    if (field === 'recruiterId') {
      return applicant.recruiter?.name || 'Unassigned';
    }
    if (field === 'positionId') {
      return applicant.position?.title || applicant.positionId || 'No Position';
    }
    return (applicant as any)[field] ?? applicant.customAttributes?.[field];
  };

  let rowValuesToShow = visibleRowValues.length > 0
    ? visibleRowValues
    : Array.from(new Set(applicants.map(c => getFieldValue(c, rowField)))).filter(Boolean);
  if (rowValuesToShow.length === 0) {
    rowValuesToShow = ['All applicants'];
  }
  const isColumnBased = columnField && columnField !== 'none';
  const isRowBased = rowField && rowField !== 'none';
  const showSingleRow = !isRowBased || rowField === 'none';
  const effectiveColumnValues = isColumnBased && visibleColumnValues.length > 0
    ? visibleColumnValues
    : Array.from(new Set(applicants.map(c => getFieldValue(c, columnField)))).filter(Boolean);
  const effectiveColumnField = isColumnBased ? columnField : null;

  const handleCardClick = (applicant: Applicant) => {
    if (onCardClick) onCardClick(applicant);
  };

  const handleDragStart = (applicant: Applicant) => {
    setDraggedApplicant(applicant);
    setIsDragging(true);
    document.body.style.cursor = 'grabbing';
  };

  const handleDragEnd = () => {
    setDraggedApplicant(null);
    setDragOverRow(null);
    setDragOverColumn(null);
    setIsDragging(false);
    document.body.style.cursor = '';
  };

  const handleDragOver = (rowValue: string, colValue: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only allow dropping if we're dragging a Applicant
    if (draggedApplicant) {
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

  const persistApplicantFieldUpdate = async (applicant: Applicant, field: string, value: any) => {
    try {
      if (field === 'status') {
        toast.loading('Updating Applicant status...', { id: applicant.id });
        const res = await fetch('/api/applicants/bulk-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'change_status',
            applicantIds: [applicant.id],
            newStatus: value
          })
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 403) {
            throw new Error('Permission denied: You do not have permission to update Applicant status. Please contact your administrator.');
          }
          throw new Error(data.message || `Failed to update Applicant status: HTTP ${res.status}`);
        }

        const result = await res.json();

        // Check for rejected applicants due to headcount constraints
        if (result.rejectedApplicants && result.rejectedApplicants.length > 0) {
          const rejectedApplicant = result.rejectedApplicants.find((c: any) => c.applicantId === applicant.id);
          if (rejectedApplicant) {
            throw new Error(`Headcount constraint: ${rejectedApplicant.message}`);
          }
        }

        toast.success(`Status updated to ${value}`, { id: applicant.id });
      } else if (field === 'recruiterId' || field === 'positionId') {
        toast.loading('Updating Applicant...', { id: applicant.id });
        const res = await fetch(`/api/applicants/${applicant.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value })
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to update Applicant');
        }
        toast.success('Applicant updated', { id: applicant.id });
      }
    } catch (error: any) {
      // Check if it's a headcount constraint error
      if (error.message && error.message.includes('Headcount constraint:')) {
        // For headcount constraint errors, we need to show a more detailed error
        // since we don't have access to the HeadcountWarningModal here
        toast.error(error.message, { duration: 8000 });
      } else {
        toast.error(getErrorMessage(error), { id: applicant.id });
      }
    }
  };

  const handleDrop = async (rowValue: string, colValue: string) => {
    if (draggedApplicant) {
      // Determine which field to update based on the layout
      if (isColumnBased && !isRowBased) {
        // Column-based layout: update column field
        const newValue = colValue;
        if (getFieldValue(draggedApplicant, columnField) !== newValue) {
          if (onMoveApplicant) {
            onMoveApplicant(draggedApplicant, newValue);
          } else {
            await persistApplicantFieldUpdate(draggedApplicant, columnField, newValue);
          }
        }
      } else if (isRowBased && !isColumnBased) {
        // Row-based layout: update row field
        const newValue = rowValue;
        if (getFieldValue(draggedApplicant, rowField) !== newValue) {
          if (onMoveApplicant) {
            onMoveApplicant(draggedApplicant, newValue);
          } else {
            await persistApplicantFieldUpdate(draggedApplicant, rowField, newValue);
          }
        }
      } else if (isRowBased && isColumnBased) {
        // Both row and column: update both fields
        const updateData: any = {};
        if (getFieldValue(draggedApplicant, rowField) !== rowValue) {
          updateData[rowField] = rowValue;
        }
        if (getFieldValue(draggedApplicant, columnField) !== colValue) {
          updateData[columnField] = colValue;
        }

        if (Object.keys(updateData).length > 0) {
          // For now, prioritize row field update
          if (onMoveApplicant) {
            onMoveApplicant(draggedApplicant, rowValue);
          } else {
            await persistApplicantFieldUpdate(draggedApplicant, rowField, rowValue);
          }
        }
      }
    }

    setDraggedApplicant(null);
    setDragOverRow(null);
    setDragOverColumn(null);
    setIsDragging(false);
    document.body.style.cursor = '';
  };

  // If no applicants, show fallback
  if (!applicants || applicants.length === 0) {
    return (
      <div className="w-full min-h-[300px] bg-muted/30 rounded-lg p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-muted rounded-full flex items-center justify-center">
            <Plus className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-lg text-muted-foreground">No applicants found</p>
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
    // Find applicants that do not match any column value
    const uncategorizedApplicants = applicants.filter(applicant => {
      const colValue = getFieldValue(applicant, columnField);
      return !columnsToShow.includes(colValue);
    });
    return (
      <div className="w-full h-[calc(100%-200px)] min-h-[400px] bg-muted/30 rounded-lg p-4 flex gap-4">
        {columnsToShow.map((colValue) => {
          const colApplicants = applicants.filter(applicant =>
            getFieldValue(applicant, columnField) === colValue
          );
          return (
            <div key={colValue} className="flex flex-col h-full" style={{ flex: '1 1 0%' }}>
              <Card className={cn(
                "flex flex-col h-full shadow-sm border border-border bg-card transition-all duration-200",
                dragOverColumn === colValue && dragOverRow === 'none' && "ring-2 ring-primary ring-opacity-50 bg-primary/5"
              )}>
                <CardHeader className="p-4 border-b border-border sticky top-16 bg-card z-10 flex-shrink-0">
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

                  {colApplicants.length > 0 ? (
                    <div className="space-y-2">
                      {colApplicants.map(applicant => (
                        <div
                          key={applicant.id}
                          className={cn(
                            "group w-full transition-all duration-200",
                            draggedApplicant?.id === applicant.id && "opacity-60 scale-95"
                          )}
                        >
                          <EnhancedApplicantCard
                            applicant={applicant}
                            isDragged={draggedApplicant?.id === applicant.id}
                            onClick={() => handleCardClick(applicant)}
                            onDragStart={() => handleDragStart(applicant)}
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
            <CardHeader className="p-4 border-b border-border sticky top-16 bg-card z-10 flex-shrink-0">
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
                {uncategorizedApplicants.length > 0 ? uncategorizedApplicants.map(applicant => (
                  <div
                    key={applicant.id}
                    className={cn(
                      "group w-full transition-all duration-200",
                      draggedApplicant?.id === applicant.id && "opacity-60 scale-95"
                    )}
                  >
                    <EnhancedApplicantCard
                      applicant={applicant}
                      isDragged={draggedApplicant?.id === applicant.id}
                      onClick={() => handleCardClick(applicant)}
                      onDragStart={() => handleDragStart(applicant)}
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
      <div className="w-full h-[calc(100%-200px)] min-h-[400px] bg-muted/30 rounded-lg p-4 flex flex-col gap-4 overflow-y-auto">
        <div className="flex flex-row flex-wrap gap-3">
          {applicants.map(applicant => (
            <div
              key={applicant.id}
              className={cn(
                "group w-full",
                draggedApplicant?.id === applicant.id && "opacity-60 scale-95"
              )}
            >
              <EnhancedApplicantCard
                applicant={applicant}
                isDragged={draggedApplicant?.id === applicant.id}
                onClick={() => handleCardClick(applicant)}
                onDragStart={() => handleDragStart(applicant)}
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
      uncategorizedByCol[colValue] = applicants.filter(applicant => {
        const rowValue = getFieldValue(applicant, rowField);
        const colVal = getFieldValue(applicant, columnField);
        return colVal === colValue && !rowValuesToShow.includes(rowValue);
      });
    });
    // Find applicants that do not match any column value
    const uncategorizedColApplicants = applicants.filter(applicant => {
      const colVal = getFieldValue(applicant, columnField);
      return !effectiveColumnValues.includes(colVal);
    });
    return (
      <div className="w-full h-[calc(100%-200px)] min-h-[400px] bg-muted/30 rounded-lg p-4 flex gap-4">
        {effectiveColumnValues.map((colValue) => (
          <div key={colValue} className="flex flex-col h-full" style={{ flex: '1 1 0%' }}>
            <Card className="flex flex-col h-full shadow-sm border border-border bg-card">
              <CardHeader className="p-4 border-b border-border sticky top-16 bg-card z-10 flex-shrink-0">
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
                  const cellApplicants = applicants.filter(applicant =>
                    getFieldValue(applicant, rowField) === rowValue &&
                    getFieldValue(applicant, columnField) === colValue
                  );
                  return (
                    <div key={rowValue} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{rowValue}</span>
                        <Badge variant="secondary" className="text-xs">
                          {cellApplicants.length}
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
                        {cellApplicants.length > 0 ? (
                          <div className="space-y-2">
                            {cellApplicants.map(applicant => (
                              <div
                                key={applicant.id}
                                className={cn(
                                  "group w-full",
                                  draggedApplicant?.id === applicant.id && "opacity-60 scale-95"
                                )}
                              >
                                <EnhancedApplicantCard
                                  applicant={applicant}
                                  isDragged={draggedApplicant?.id === applicant.id}
                                  onClick={() => handleCardClick(applicant)}
                                  onDragStart={() => handleDragStart(applicant)}
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
                      {uncategorizedByCol[colValue].length > 0 ? uncategorizedByCol[colValue].map(applicant => (
                        <div
                          key={applicant.id}
                          className={cn(
                            "group w-full",
                            draggedApplicant?.id === applicant.id && "opacity-60 scale-95"
                          )}
                        >
                          <EnhancedApplicantCard
                            applicant={applicant}
                            isDragged={draggedApplicant?.id === applicant.id}
                            onClick={() => handleCardClick(applicant)}
                            onDragStart={() => handleDragStart(applicant)}
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
            <CardHeader className="p-4 border-b border-border sticky top-16 bg-card z-10 flex-shrink-0">
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
                const cellApplicants = uncategorizedColApplicants.filter(applicant =>
                  (applicant[rowField as keyof typeof applicant] ?? applicant.customAttributes?.[rowField]) === rowValue
                );
                return (
                  <div key={rowValue} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{rowValue}</span>
                      <Badge variant="secondary" className="text-xs">
                        {cellApplicants.length}
                      </Badge>
                    </div>
                    <div className="min-h-[80px] p-2 rounded-lg border-2 border-dashed border-muted transition-all duration-200">
                      {cellApplicants.length > 0 ? (
                        <div className="space-y-2">
                          {cellApplicants.map(applicant => (
                            <div
                              key={applicant.id}
                              className={cn(
                                "group w-full",
                                draggedApplicant?.id === applicant.id && "opacity-60 scale-95"
                              )}
                            >
                              <EnhancedApplicantCard
                                applicant={applicant}
                                isDragged={draggedApplicant?.id === applicant.id}
                                onClick={() => handleCardClick(applicant)}
                                onDragStart={() => handleDragStart(applicant)}
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
    const colApplicants = applicants.filter(c => {
      const value = c[columnField as keyof typeof c] ?? c.customAttributes?.[columnField];
      return value === colValue;
    });
    return (
      <div className="w-full h-[calc(100%-200px)] min-h-[400px] bg-muted/30 rounded-lg p-4 flex flex-col items-center justify-center overflow-y-auto">
        <SingleRowApplicantView
          applicants={colApplicants}
          onCardClick={onCardClick}
          onMoveApplicant={onMoveApplicant}
          visibleFields={visibleFields}
          recruiters={recruiters}
        />
      </div>
    );
  }

  // Grouped row layout (no columns)
  return (
    <div className="w-full h-[calc(100%-200px)] min-h-[400px] bg-muted/30 rounded-lg p-4 flex flex-col gap-4 overflow-y-auto">
      <div className="grid grid-cols-1 gap-4">
        {rowValuesToShow.map(rowValue => {
          // If fallback, show all applicants
          const rowApplicants = rowValue === 'All applicants'
            ? applicants
            : applicants.filter(applicant =>
              ((applicant as any)[rowField] ?? applicant.customAttributes?.[rowField]) === rowValue
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
                  {rowApplicants.length} applicants
                </Badge>
              </div>
              <div className="flex-1 min-h-[80px]">
                <div className="flex flex-row flex-wrap gap-3">
                  {rowApplicants.map(applicant => (
                    <div
                      key={applicant.id}
                      className={cn(
                        "group w-full",
                        draggedApplicant?.id === applicant.id && "opacity-60 scale-95"
                      )}
                    >
                      <EnhancedApplicantCard
                        applicant={applicant}
                        isDragged={draggedApplicant?.id === applicant.id}
                        onClick={() => handleCardClick(applicant)}
                        onDragStart={() => handleDragStart(applicant)}
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


// Single Row Applicant View for use within each row when there's only 1 column or no columns
// Shows multiple applicant cards horizontally with scroll navigation (like job matches)
export function SingleRowApplicantView({
  applicants,
  onCardClick,
  onMoveApplicant,
  visibleFields = ['name', 'email', 'status', 'fitScore'],
  recruiters
}: {
  applicants: Applicant[];
  onCardClick?: (applicant: Applicant) => void;
  onMoveApplicant?: (applicant: Applicant, newValue: string) => void;
  visibleFields?: string[];
  recruiters?: UserProfile[];
}) {
  const isMobile = useIsMobile();
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollLeftTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    };
  }, []);

  if (applicants.length === 0) {
    return (
      <div className="flex items-center justify-center w-full py-8">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-muted rounded-full flex items-center justify-center">
            <Plus className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No applicants</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Drag applicants here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Left Navigation Button */}
      {Applicants.length > 1 && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const container = document.querySelector('.applicants-horizontal-container');
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
      {applicants.length > 1 && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const container = document.querySelector('.applicants-horizontal-container');
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

      {/* Horizontal Scrollable Container - Mobile carousel with peek effect */}
      <div
        className="flex flex-row overflow-x-auto gap-3 pb-2 applicants-horizontal-container scrollbar-hide md:px-0 px-4 md:pr-0 pr-4"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'x mandatory'
        }}
        onScroll={(e) => {
          const target = e.target as HTMLElement;
          setScrollPosition(target.scrollLeft);
        }}
      >
        {applicants.map((applicant, index) => (
          <Card
            key={`applicant-${applicant.id}-${index}`}
            className={cn(
              "flex-shrink-0 w-[calc(100vw-5rem)] md:w-80 p-4 rounded-lg hover:shadow-md transition-shadow cursor-pointer bg-card",
              !isMobile && "border",
              isMobile && "border-0"
            )}
            style={{
              scrollSnapAlign: 'start'
            }}
            onClick={() => onCardClick?.(applicant)}
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage
                  src={applicant.avatarUrl ? convertMinIOUrlToSecureUrl(applicant.avatarUrl) || undefined : `https://placehold.co/40x40.png?text=${formatApplicantName(applicant)?.charAt(0) || 'C'}`}
                  alt={formatApplicantName(applicant)}
                />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {formatApplicantName(applicant)?.charAt(0)?.toUpperCase() || 'C'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 space-y-2">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground truncate" title={formatApplicantName(applicant)}>
                      {formatApplicantName(applicant)}
                    </p>
                    {visibleFields.includes('positionId') && (
                      <p className="text-xs text-muted-foreground truncate" title={applicant.position?.title || 'N/A'}>
                        <Target className="w-3 h-3 inline mr-1" />
                        {applicant.position?.title || 'N/A'}
                      </p>
                    )}
                  </div>
                  {/* Status Badge */}
                  <StatusBadge statusId={applicant.statusId} className="text-xs px-2 py-1 flex-shrink-0" />
                </div>

                {/* Contact Information */}
                <div className="space-y-1">
                  {visibleFields.includes('email') && applicant.email && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{applicant.email}</span>
                    </div>
                  )}
                  {visibleFields.includes('phone') && applicant.phone && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Phone className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{applicant.phone}</span>
                    </div>
                  )}
                  {visibleFields.includes('applicationDate') && applicant.applicationDate && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span>Applied: {new Date(applicant.applicationDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {visibleFields.includes('recruiterId') && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <User className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{applicant.recruiter?.name || applicant.recruiterId || 'Unassigned'}</span>
                    </div>
                  )}
                </div>

                {/* Fit Score */}
                {visibleFields.includes('fitScore') && applicant.fitScore !== undefined && applicant.fitScore !== null && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{getFieldLabel('fitScore')}</span>
                      <span className="font-medium text-foreground">
                        {applicant.fitScore === null || applicant.fitScore === undefined ? 'Not scored' : formatScoreWithGrade(applicant.fitScore)}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={cn("h-2 rounded-full transition-all duration-300", getScoreBgColor(applicant.fitScore))}
                        style={{ width: `${normalizeFitScore(applicant.fitScore)}%` }}
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
                      onCardClick?.(applicant);
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

      {/* applicants count indicator */}
      {applicants.length > 1 && (
        <div className="flex justify-center mt-2">
          <Badge variant="secondary" className="text-xs">
            {applicants.length} applicant{applicants.length !== 1 ? 's' : ''}
            {applicants.length > 3 && (
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
  applicants,
  statuses,
  onMoveApplicant,
  onCardClick,
  rowField = 'status',
  columnField = 'recruiterId',
  visibleFields = ['name', 'email', 'status', 'fitScore'],
  visibleRowValues = [],
  visibleColumnValues = [],
  isLoading = false
}: ApplicantKanbanViewProps & { visibleFields?: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApplicantSummary, setSelectedApplicantSummary] = useState<Partial<Applicant> & { id: string; name: string } | null>(null);

  // Helper function to get the proper value for a field
  const getFieldValue = (applicant: Applicant, field: string) => {
    if (field === 'recruiterId') {
      return applicant.recruiter?.name || 'Unassigned';
    }
    if (field === 'positionId') {
      return applicant.position?.title || applicant.positionId || 'No Position';
    }
    return (applicant as any)[field] ?? applicant.customAttributes?.[field];
  };

  // Filter applicants to only show those that match the current row/column configuration - MUST be called before any early returns
  const filteredApplicants = useMemo(() => {
    // Defensive check to prevent "filter is not a function" errors
    if (!Array.isArray(applicants)) {
      return [];
    }

    return applicants.filter(applicant => {
      const rowValue = getFieldValue(applicant, rowField);
      const colValue = columnField && columnField !== 'none'
        ? getFieldValue(applicant, columnField)
        : null;

      // FIXED: More permissive filtering logic
      let rowMatch = true;
      if (rowField && rowField !== 'none') {
        if (visibleRowValues.length > 0) {
          // If visible row values are specified, applicant must match one of them
          rowMatch = Boolean(typeof rowValue === 'string' && !!rowValue && visibleRowValues.includes(rowValue as string));
        } else {
          // If no visible row values specified, show all applicants (don't filter by row)
          rowMatch = true;
        }
      }

      let colMatch = true;
      if (columnField && columnField !== 'none') {
        if (visibleColumnValues.length > 0) {
          // If visible column values are specified, applicant must match one of them
          if (!colValue) {
            colMatch = true; // No column value means it matches
          } else {
            colMatch = Boolean(typeof colValue === 'string' && !!colValue && visibleColumnValues.includes(colValue as string));
          }
        } else {
          // If no visible column values specified, show all applicants (don't filter by column)
          colMatch = true;
        }
      }

      return rowMatch && colMatch;
    });
  }, [applicants, rowField, columnField, visibleRowValues, visibleColumnValues]);

  // Reset index when applicants change - MUST be called before any early returns
  useEffect(() => {
    setCurrentIndex(0);
  }, [filteredApplicants.length]);

  // Show loading state - must happen after all hooks
  if (isLoading) {
    return (
      <div className="w-full min-h-[300px] bg-muted/30 rounded-lg p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-muted rounded-full flex items-center justify-center animate-pulse">
            <Users className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-lg text-muted-foreground">Loading applicants...</p>
        </div>
      </div>
    );
  }

  const handleCardClick = (applicant: Applicant) => {
    if (onCardClick) {
      onCardClick(applicant);
    } else {
      // Validate parsedData to ensure it has the expected structure
      const validatedParsedData = applicant.parsedData && typeof applicant.parsedData === 'object' ? {
        ...applicant.parsedData,
        // Ensure array fields are actually arrays
        job_matches: 'job_matches' in applicant.parsedData && Array.isArray((applicant.parsedData as any).job_matches) ? (applicant.parsedData as any).job_matches : [],
        education: 'education' in applicant.parsedData && Array.isArray((applicant.parsedData as any).education) ? (applicant.parsedData as any).education : [],
        experience: 'experience' in applicant.parsedData && Array.isArray((applicant.parsedData as any).experience) ? (applicant.parsedData as any).experience : [],
        skills: 'skills' in applicant.parsedData && Array.isArray((applicant.parsedData as any).skills) ? (applicant.parsedData as any).skills : [],
        job_suitable: 'job_suitable' in applicant.parsedData && Array.isArray((applicant.parsedData as any).job_suitable) ? (applicant.parsedData as any).job_suitable : [],
      } : {};

      setSelectedApplicantSummary({
        id: applicant.id,
        name: formatApplicantName(applicant),
        email: applicant.email,
        phone: applicant.phone,
        status: applicant.statusId,
        position: applicant.position,
        fitScore: applicant.fitScore,
        parsedData: validatedParsedData
      });
      setIsModalOpen(true);
    }
  };

  const handlePrevious = () => {
    setCurrentIndex(prev => prev > 0 ? prev - 1 : filteredApplicants.length - 1);
  };

  const handleNext = () => {
    setCurrentIndex(prev => prev < filteredApplicants.length - 1 ? prev + 1 : 0);
  };

  const currentApplicant = filteredApplicants[currentIndex];

  if (filteredApplicants.length === 0) {
    return (
      <>
        <div className="w-full h-[calc(100%-200px)] min-h-[400px] p-4 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No applicants found</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {applicants.length > 0
                ? "No applicants match the current board configuration. Try adjusting your board settings or resetting to default."
                : "No applicants available. Please add some applicants first."
              }
            </p>
            {applicants.length > 0 && (
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
      <div className="w-full h-[calc(100%-200px)] min-h-[400px] bg-muted/30 rounded-lg p-4 flex items-center justify-center">
        <div className="w-full max-w-4xl">
          {/* Navigation Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-foreground">My Tasks</h2>
              <Badge variant="secondary" className="text-sm">
                {currentIndex + 1} of {filteredApplicants.length}
              </Badge>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevious}
                disabled={filteredApplicants.length <= 1}
                className="h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                disabled={filteredApplicants.length <= 1}
                className="h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Applicant Card */}
          <div className="bg-card border border-border rounded-lg shadow-sm p-6">
            {currentApplicant && (
              <div className="flex items-start gap-6">
                {/* Avatar and Basic Info */}
                <div className="flex-shrink-0">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src={currentApplicant.avatarUrl ? convertMinIOUrlToSecureUrl(currentApplicant.avatarUrl) || undefined : `https://placehold.co/64x64.png?text=${formatApplicantName(currentApplicant)?.charAt(0) || 'C'}`}
                      alt={formatApplicantName(currentApplicant)}
                    />
                    <AvatarFallback className="bg-primary/10 text-primary text-base">
                      {formatApplicantName(currentApplicant)?.charAt(0)?.toUpperCase() || 'C'}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Applicant Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-1">
                        {formatApplicantName(currentApplicant)}
                      </h3>
                      <p className="text-muted-foreground">
                        <Target className="w-4 h-4 inline mr-2" />
                        {currentApplicant.position?.title || 'No position assigned'}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <StatusBadge status={currentApplicant.status} className="text-sm px-3 py-1" />
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {visibleFields.includes('email') && currentApplicant.email && (
                      <div className="flex items-center text-sm">
                        <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="text-foreground">{currentApplicant.email}</span>
                      </div>
                    )}
                    {visibleFields.includes('phone') && currentApplicant.phone && (
                      <div className="flex items-center text-sm">
                        <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="text-foreground">{currentApplicant.phone}</span>
                      </div>
                    )}
                    {visibleFields.includes('applicationDate') && currentApplicant.applicationDate && (
                      <div className="flex items-center text-sm">
                        <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="text-foreground">
                          Applied: {new Date(currentApplicant.applicationDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {visibleFields.includes('recruiterId') && (
                      <div className="flex items-center text-sm">
                        <User className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="text-foreground">{currentApplicant.recruiter?.name || currentApplicant.recruiterId || 'Unassigned'}</span>
                      </div>
                    )}
                  </div>

                  {/* Fit Score */}
                  {visibleFields.includes('fitScore') && currentApplicant.fitScore !== undefined && currentApplicant.fitScore !== null && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">{getFieldLabel('fitScore')}</span>
                        <span className="text-sm font-semibold text-foreground">
                          {currentApplicant.fitScore === null || currentApplicant.fitScore === undefined ? 'Not scored' : formatScoreWithGrade(currentApplicant.fitScore)}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div
                          className={cn("h-3 rounded-full transition-all duration-300", getScoreBgColor(currentApplicant.fitScore))}
                          style={{ width: `${normalizeFitScore(currentApplicant.fitScore)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => handleCardClick(currentApplicant)}
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
          {filteredApplicants.length > 1 && (
            <div className="flex items-center justify-center mt-6">
              <div className="flex gap-2">
                {filteredApplicants.map((_, index) => (
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

      {/* Applicant Detail Modal - only show if onCardClick is not provided */}
      {!onCardClick && selectedApplicantSummary && (
        <FullApplicantDetail
          applicantId={selectedApplicantSummary.id}
          isModal={true}
          onClose={() => setIsModalOpen(false)}
          comments={[]}
          resumes={[]}
          onRefresh={() => { }}
        />
      )}
    </>
  );
}

export function MultiRecruiterKanbanView({ applicants, stages, recruiters, onMoveApplicant, onCardClick }: {
  applicants: Applicant[];
  stages: string[];
  recruiters: UserProfile[];
  onMoveApplicant?: (applicant: Applicant, stage: string, recruiterId: string) => void;
  onCardClick?: (applicant: Applicant) => void;
}) {
  const [draggedApplicant, setDraggedApplicant] = useState<any>(null);
  const [dragOverStage, setDragOverStage] = useState<any>(null);
  const [dragOverRecruiter, setDragOverRecruiter] = useState<any>(null);

  const handleDragStart = (applicant: Applicant) => setDraggedApplicant(applicant);
  const handleDragEnd = () => {
    setDraggedApplicant(null);
    setDragOverStage(null);
    setDragOverRecruiter(null);
  };
  const handleDragOver = (stage: string, recruiter: UserProfile, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverStage(stage);
    setDragOverRecruiter(recruiter);
  };
  const handleDrop = (stage: string, recruiter: UserProfile) => {
    if (draggedApplicant) {
      onMoveApplicant?.(draggedApplicant, stage, recruiter.id);
    }
    setDraggedApplicant(null);
    setDragOverStage(null);
    setDragOverRecruiter(null);
  };

  const handleCardClick = (applicant: Applicant) => {
    if (onCardClick) {
      onCardClick(applicant);
    }
  };



  return (
    <div className="w-full h-[calc(100%-200px)] min-h-[400px] bg-muted/30 rounded-lg p-4 flex gap-4">
      {recruiters.map((recruiter) => (
        <div key={recruiter.id} className="flex-shrink-0 w-80 flex flex-col h-full">
          <Card className="flex flex-col h-full shadow-sm border border-border bg-card">
            <CardHeader className="p-4 border-b border-border sticky top-16 bg-card z-10 flex-shrink-0">
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
                {stages.map((stage) => {
                  const stageApplicants = (() => {
                    try {
                      // Defensive check to prevent filter errors
                      if (!Array.isArray(applicants)) {
                        console.warn('ApplicantKanbanView: applicants is not an array:', applicants);
                        return [];
                      }

                      return applicants.filter((c: Applicant) => {
                        try {
                          return c && (c as any).status === stage && c.recruiterId === recruiter.id;
                        } catch (error) {
                          console.warn('ApplicantKanbanView: Error filtering stage applicant:', error, c);
                          return false;
                        }
                      });
                    } catch (error) {
                      console.error('ApplicantKanbanView: Error filtering stage applicants:', error);
                      return [];
                    }
                  })();
                  return (
                    <div key={stage} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{stage}</span>
                        <Badge variant="secondary" className="text-xs">
                          {stageApplicants.length}
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
                        {stageApplicants.length > 0 ? (
                          <div className="space-y-2">
                            {stageApplicants.map((applicant) => (
                              <div
                                key={applicant.id}
                                className={cn(
                                  "cursor-pointer group p-3 bg-card border border-border rounded-lg hover:shadow-sm transition-all duration-200",
                                  draggedApplicant?.id === applicant.id && "opacity-60 scale-95"
                                )}
                                draggable
                                onDragStart={() => handleDragStart(applicant)}
                                onDragEnd={handleDragEnd}
                                onClick={() => handleCardClick(applicant)}
                              >
                                <div className="flex items-start gap-2">
                                  <ApplicantAvatar
                                    user={applicant}
                                    size="sm"
                                    className="h-6 w-6 flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-foreground truncate" title={formatApplicantName(applicant)}>
                                      {formatApplicantName(applicant)}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate" title={applicant.position?.title || 'N/A'}>
                                      {applicant.position?.title || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                                {applicant.fitScore !== undefined && applicant.fitScore !== null && (
                                  <div className="mt-2 space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">{getFieldLabel('fitScore')}</span>
                                      <span className="font-medium text-foreground">
                                        {applicant.fitScore === null || applicant.fitScore === undefined ? 'Not scored' : formatScoreWithGrade(applicant.fitScore)}
                                      </span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-1">
                                      <div
                                        className={cn("h-1 rounded-full transition-all duration-300", getScoreBgColor(applicant.fitScore))}
                                        style={{ width: `${normalizeFitScore(applicant.fitScore)}%` }}
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
  applicants,
  statuses,
  recruiters,
  onMoveApplicant,
  onCardClick,
  rowField = 'status',
  columnField = 'none',
  visibleFields = ['name', 'email', 'status', 'fitScore'],
  visibleRowValues = [],
  visibleColumnValues = []
}: ApplicantKanbanViewProps) {
  const [draggedApplicant, setDraggedApplicant] = useState<Applicant | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Determine what to show as columns based on columnField
  const getColumnValue = (applicant: Applicant) => {
    if (columnField === 'none') return 'All applicants';
    if (columnField === 'status') return applicant.statusId || (applicant as any).status;
    if (columnField === 'recruiterId') {
      // For recruiterId, we need to match against recruiter names, not IDs
      // If the Applicant has a recruiter object with a name, use that
      if (applicant.recruiter?.name) {
        return applicant.recruiter.name;
      }
      // If no recruiter name but has recruiterId, we need to find the recruiter name
      // This should be handled by the API, but as a fallback, return 'Unassigned'
      return 'Unassigned';
    }
    if (columnField === 'positionId') return applicant.position?.title || applicant.positionId || 'No Position';
    if (columnField === 'fitScore') {
      if (applicant.fitScore === null || applicant.fitScore === undefined) return 'No Score';
      const gradeInfo = getScoreGradeInfo(applicant.fitScore);
      if (gradeInfo) {
        return `${gradeInfo.letter} (${gradeInfo.range})`;
      }
      return 'No Score';
    }
    // Check custom attributes
    if (applicant.customAttributes && applicant.customAttributes[columnField]) {
      return applicant.customAttributes[columnField];
    }
    // Check parsed data
    const parsedValue = getParsedDataProperty(applicant, columnField);
    if (parsedValue) return parsedValue;

    return 'Unknown';
  };

  // Use visibleColumnValues if provided, otherwise use all unique column values
  const columnsToShow = visibleColumnValues.length > 0
    ? visibleColumnValues
    : Array.from(new Set(applicants.map(getColumnValue))).filter(Boolean);

  // Group applicants by column value
  const applicantsByColumn = useMemo(() => {
    const grouped: Record<string, Applicant[]> = {};

    // Initialize all columns with empty arrays
    columnsToShow.forEach(column => {
      grouped[column] = [];
    });

    // Group applicants by their column value
    applicants.forEach(applicant => {
      const columnValue = getColumnValue(applicant);
      if (columnValue && columnsToShow.includes(columnValue)) {
        if (!grouped[columnValue]) {
          grouped[columnValue] = [];
        }
        grouped[columnValue].push(applicant);
      }
    });

    return grouped;
  }, [applicants, columnsToShow, columnField]);

  // Enhanced drag and drop handlers
  const handleDragStart = (applicant: Applicant) => {
    // Only allow dragging for status columns
    if (columnField === 'status') {
      setDraggedApplicant(applicant);
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
    setDraggedApplicant(null);
    setDragOverStage(null);
    setIsDragging(false);
    document.body.style.cursor = '';
  };

  const handleDragOver = (column: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only allow dropping if we're dragging a applicant, it's not the same column, and it's a status column
    if (draggedApplicant && getColumnValue(draggedApplicant) !== column && columnField === 'status') {
      setDragOverStage(column);
      e.dataTransfer.dropEffect = 'move';
    } else if (draggedApplicant && columnField !== 'status') {
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

  const persistApplicantFieldUpdate = async (applicant: Applicant, field: string, value: any) => {
    try {
      if (field === 'status') {
        toast.loading('Updating Applicant status...', { id: applicant.id });
        const res = await fetch('/api/applicants/bulk-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'change_status',
            applicantIds: [applicant.id],
            newStatus: value
          })
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 403) {
            throw new Error('Permission denied: You do not have permission to update Applicant status. Please contact your administrator.');
          }
          throw new Error(data.message || `Failed to update Applicant status: HTTP ${res.status}`);
        }

        const result = await res.json();

        // Check for rejected applicants due to headcount constraints
        if (result.rejectedApplicants && result.rejectedApplicants.length > 0) {
          const rejectedApplicant = result.rejectedApplicants.find((c: any) => c.applicantId === applicant.id);
          if (rejectedApplicant) {
            throw new Error(`Headcount constraint: ${rejectedApplicant.message}`);
          }
        }

        toast.success(`Status updated to ${value}`, { id: applicant.id });
      } else if (field === 'recruiterId' || field === 'positionId') {
        toast.loading('Updating Applicant...', { id: applicant.id });
        const res = await fetch(`/api/applicants/${applicant.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value })
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to update Applicant');
        }
        toast.success('Applicant updated', { id: applicant.id });
      }
    } catch (error: any) {
      // Check if it's a headcount constraint error
      if (error.message && error.message.includes('Headcount constraint:')) {
        // For headcount constraint errors, we need to show a more detailed error
        // since we don't have access to the HeadcountWarningModal here
        toast.error(error.message, { duration: 8000 });
      } else {
        toast.error(getErrorMessage(error), { id: applicant.id });
      }
    }
  };

  const handleDrop = async (column: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedApplicant && getColumnValue(draggedApplicant) !== column) {
      // Only allow drag and drop for status-based columns
      if (columnField === 'status') {
        if (onMoveApplicant) {
          onMoveApplicant(draggedApplicant, column);
        } else {
          await persistApplicantFieldUpdate(draggedApplicant, 'status', column);
        }
      } else {
        // For non-status columns, show a warning that drag and drop is not supported
        toast?.('Drag and drop is only supported for status columns');
      }
    }
    setDraggedApplicant(null);
    setDragOverStage(null);
    setIsDragging(false);
    document.body.style.cursor = '';
  };

  const handleCardClick = (applicant: Applicant) => {
    if (onCardClick) {
      onCardClick(applicant);
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
    <div className="w-full h-[calc(100%-200px)] min-h-[400px] bg-muted/30 rounded-lg p-4">
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
              {applicants.length} applicants
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
            const columnApplicants = applicantsByColumn[column] || [];
            const isDragOver = dragOverStage === column;
            const isCurrentColumn = draggedApplicant && getColumnValue(draggedApplicant) === column;

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
                  <CardHeader className="p-4 border-b border-border sticky top-16 bg-card z-10 flex-shrink-0">
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
                        {columnApplicants.length}
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
                      if (draggedApplicant && getColumnValue(draggedApplicant) !== column) {
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

                    {columnApplicants.length > 0 ? (
                      <div className="space-y-3">
                        {columnApplicants.map(applicant => (
                          <div
                            key={applicant.id}
                            className={cn(
                              "group w-full transition-all duration-200",
                              draggedApplicant?.id === applicant.id && "opacity-60 scale-95"
                            )}
                          >
                            <EnhancedApplicantCard
                              applicant={applicant}
                              isDragged={draggedApplicant?.id === applicant.id}
                              onClick={() => handleCardClick(applicant)}
                              onDragStart={() => handleDragStart(applicant)}
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
                            {isDragOver && !isCurrentColumn ? "Drop here" : "Drop applicants here"}
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
