"use client";

import type { ComponentType } from 'react';
import {
  AlertCircle,
  KanbanSquare,
  MapPin,
  Settings2,
  Users,
} from 'lucide-react';

import { CustomFieldsTab } from './CustomFieldsTab';
import { HeadcountTypesTab } from './HeadcountTypesTab';
import { ApplicantSourcesTab } from './ApplicantSourcesTab';
import { RecruitmentStagesTab } from './RecruitmentStagesTab';
import { GradesTab } from '@/components/settings/GradesTab';
import { PositionLevelsTab } from '@/components/settings/PositionLevelsTab';
import { cn } from '@/lib/utils';
import type {
  DataConfigurationIconKey,
  DataConfigurationNavigationGroup,
  DataConfigurationPageId,
} from './data-configuration-page-utils';

const DATA_CONFIGURATION_ICONS: Record<DataConfigurationIconKey, ComponentType<{ className?: string }>> = {
  customFields: Settings2,
  grades: Users,
  headcount: Users,
  levels: Users,
  sources: MapPin,
  stages: KanbanSquare,
};

interface DataConfigurationHeaderProps {
  showLogoOnly: boolean;
}

export function DataConfigurationHeader({ showLogoOnly }: DataConfigurationHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        {!showLogoOnly && (
          <h1 className="text-2xl font-bold text-foreground">Data Configuration</h1>
        )}
        <p className="text-muted-foreground">Manage custom fields, recruitment stages, and Applicant sources</p>
      </div>
    </div>
  );
}

interface DataConfigurationLimitedAccessBannerProps {
  message: string | null;
}

export function DataConfigurationLimitedAccessBanner({
  message,
}: DataConfigurationLimitedAccessBannerProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <h4 className="font-medium text-amber-800 mb-1">Limited Access</h4>
          <p className="text-amber-700">{message}</p>
        </div>
      </div>
    </div>
  );
}

interface DataConfigurationSidebarProps {
  activePage: DataConfigurationPageId;
  navigationGroups: DataConfigurationNavigationGroup[];
  onActivePageChange: (page: DataConfigurationPageId) => void;
}

export function DataConfigurationSidebar({
  activePage,
  navigationGroups,
  onActivePageChange,
}: DataConfigurationSidebarProps) {
  return (
    <div className="w-64 flex-shrink-0">
      <div className="bg-muted/30 rounded-lg p-3 space-y-6">
        {navigationGroups.map((group) => (
          <div key={group.title}>
            <h3 className="font-semibold text-foreground mb-2 px-4 uppercase tracking-wider text-xs bg-muted/50 py-1 rounded w-fit">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = DATA_CONFIGURATION_ICONS[item.icon];

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onActivePageChange(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-200 relative cursor-pointer rounded-md text-left',
                      activePage === item.id
                        ? 'bg-background text-primary shadow-sm border border-border'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DataConfigurationContentProps {
  activePage: DataConfigurationPageId;
  canManageCustomFields: boolean;
  canManageStages: boolean;
}

export function DataConfigurationContent({
  activePage,
  canManageCustomFields,
  canManageStages,
}: DataConfigurationContentProps) {
  return (
    <div className="flex-1 overflow-hidden bg-card rounded-lg border shadow-sm">
      <div className="h-full p-6">
        {activePage === 'recruitment-stages' && canManageStages && <RecruitmentStagesTab />}
        {activePage === 'Applicant-sources' && <ApplicantSourcesTab />}
        {activePage === 'position-headcount' && <HeadcountTypesTab />}
        {activePage === 'position-grades' && <GradesTab />}
        {activePage === 'position-levels' && <PositionLevelsTab />}
        {activePage === 'custom-fields' && canManageCustomFields && <CustomFieldsTab />}
      </div>
    </div>
  );
}
