import React, { useEffect, useState } from 'react';
import type { Applicant } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function getParsedDataProperty(applicant: Applicant, propertyName: string) {
  const parsedData = applicant.parsedData;
  if (!parsedData || typeof parsedData !== 'object') return undefined;

  if ('applicant_info' in parsedData && parsedData.applicant_info && typeof parsedData.applicant_info === 'object') {
    return (parsedData.applicant_info as any)[propertyName];
  }

  if (propertyName in parsedData) {
    return (parsedData as any)[propertyName];
  }

  return undefined;
}

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
  const [stageName, setStageName] = useState<string | null>(null);
  const [colorClass, setColorClass] = useState<string>('bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800');
  const [localStageColors, setLocalStageColors] = useState<Record<string, string>>(stageColors);

  useEffect(() => {
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

    setStageName(stageNames?.[statusToUse] || null);
  }, [status, statusId, stageNames]);

  useEffect(() => {
    const statusToUse = statusId || status;
    if (statusToUse && localStageColors[statusToUse]) {
      const stageColor = localStageColors[statusToUse];
      setColorClass(`bg-[${stageColor}]/10 text-[${stageColor}] border-[${stageColor}]/20 dark:bg-[${stageColor}]/20 dark:text-[${stageColor}] dark:border-[${stageColor}]/40`);
    } else if (stageName) {
      setColorClass(getFallbackStageColorClass(stageName));
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

export function getEducation(applicant: Applicant) {
  if (!applicant) return [];

  if (Array.isArray(applicant.educationData) && applicant.educationData.length > 0) {
    return applicant.educationData;
  }

  return getParsedDataArray(applicant, 'education');
}

export function getExperience(applicant: Applicant) {
  if (!applicant) return [];

  if (Array.isArray(applicant.experienceData) && applicant.experienceData.length > 0) {
    return applicant.experienceData;
  }

  return getParsedDataArray(applicant, 'experience');
}

export function getSkills(applicant: Applicant) {
  return getParsedDataProperty(applicant, 'skills') || [];
}

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

export function getFieldLabel(key: string) {
  return fieldLabelMap[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

function getParsedDataArray(applicant: Applicant, propertyName: string) {
  const parsedData = applicant.parsedData;
  if (!parsedData || typeof parsedData !== 'object') return [];

  if ('applicant_info' in parsedData && parsedData.applicant_info && typeof parsedData.applicant_info === 'object') {
    const value = (parsedData.applicant_info as any)[propertyName];
    if (Array.isArray(value) && value.length > 0) return value;
  }

  if (propertyName in parsedData) {
    const value = (parsedData as any)[propertyName];
    if (Array.isArray(value) && value.length > 0) return value;
  }

  return [];
}

function getFallbackStageColorClass(stageName: string) {
  const lowerStageName = stageName.toLowerCase();
  if (lowerStageName.includes('hired') || lowerStageName.includes('offer accepted')) {
    return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800';
  }
  if (lowerStageName.includes('rejected') || lowerStageName.includes('withdrawn')) {
    return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
  }
  if (lowerStageName.includes('interview')) {
    return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800';
  }
  if (lowerStageName.includes('offer extended')) {
    return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
  }
  if (lowerStageName.includes('shortlisted')) {
    return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800';
  }
  if (lowerStageName.includes('screening')) {
    return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800';
  }
  if (lowerStageName.includes('on hold')) {
    return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800';
  }
  return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
}
