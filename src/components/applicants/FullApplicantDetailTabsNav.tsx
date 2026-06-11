"use client";

import type { ReactNode } from 'react';
import {
  AcademicCapIcon as GraduationCap,
  BriefcaseIcon as Briefcase,
  ClockIcon as Clock,
  UserIcon as User,
} from '@heroicons/react/24/outline';

interface FullApplicantDetailTabsNavProps {
  activeTab: string;
  isJobMatchEnabled: boolean;
  jobMatchCount: number;
  educationCount: number;
  experienceDuration: string;
  onTabChange: (tab: string) => void;
}

interface DetailTabButtonProps {
  tab: string;
  activeTab: string;
  label: string;
  countLabel?: string;
  icon: ReactNode;
  onTabChange: (tab: string) => void;
}

function DetailTabButton({
  tab,
  activeTab,
  label,
  countLabel,
  icon,
  onTabChange,
}: DetailTabButtonProps) {
  const isActive = activeTab === tab;

  return (
    <div
      className={`text-xs flex items-center justify-center gap-2 px-4 py-4 cursor-pointer transition-colors flex-1 md:flex-1 min-w-max md:min-w-0 ${isActive ? 'border-b-2 border-primary bg-background' : 'bg-transparent'}`}
      onClick={() => onTabChange(tab)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onTabChange(tab);
        }
      }}
    >
      {icon}
      {label}
      {countLabel}
    </div>
  );
}

export function FullApplicantDetailTabsNav({
  activeTab,
  isJobMatchEnabled,
  jobMatchCount,
  educationCount,
  experienceDuration,
  onTabChange,
}: FullApplicantDetailTabsNavProps) {
  return (
    <div
      className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent md:overflow-x-visible md:pb-0 md:mx-0 md:px-0"
      style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}
    >
      <div className="flex w-full bg-background border-b border-border flex-shrink-0 min-w-max md:min-w-0">
        <DetailTabButton
          tab="jobs"
          activeTab={activeTab}
          label={isJobMatchEnabled ? 'Job Applied & Matched' : 'Job Applied'}
          countLabel={isJobMatchEnabled && jobMatchCount > 0 ? ` (${jobMatchCount})` : undefined}
          icon={<Briefcase className="w-4 h-4" />}
          onTabChange={onTabChange}
        />
        <DetailTabButton
          tab="applicant-info"
          activeTab={activeTab}
          label="Applicant Info"
          icon={<User className="w-4 h-4" />}
          onTabChange={onTabChange}
        />
        <DetailTabButton
          tab="education"
          activeTab={activeTab}
          label="Education"
          countLabel={educationCount > 0 ? ` (${educationCount})` : undefined}
          icon={<GraduationCap className="w-4 h-4" />}
          onTabChange={onTabChange}
        />
        <DetailTabButton
          tab="experience"
          activeTab={activeTab}
          label="Experience"
          countLabel={experienceDuration ? ` (${experienceDuration})` : undefined}
          icon={<Clock className="w-4 h-4" />}
          onTabChange={onTabChange}
        />
      </div>
    </div>
  );
}
