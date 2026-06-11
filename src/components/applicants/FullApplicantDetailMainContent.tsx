"use client";

import type { ComponentProps, FormEventHandler, Key } from 'react';
import { ApplicantSidebar } from './ApplicantSidebar';
import { ApplicantTabsContent } from './ApplicantTabsContent';
import { FullApplicantDetailTabsNav } from './FullApplicantDetailTabsNav';
import { cn } from '@/lib/utils';

interface FullApplicantDetailMainContentProps {
  activeTab: string;
  educationCount: number;
  experienceDuration: string;
  isJobMatchEnabled: boolean;
  isMobile: boolean;
  jobMatchCount: number;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onTabChange: (tab: string) => void;
  sidebarProps: ComponentProps<typeof ApplicantSidebar>;
  tabsContentKey?: Key;
  tabsContentProps: ComponentProps<typeof ApplicantTabsContent>;
}

export function FullApplicantDetailMainContent({
  activeTab,
  educationCount,
  experienceDuration,
  isJobMatchEnabled,
  isMobile,
  jobMatchCount,
  onSubmit,
  onTabChange,
  sidebarProps,
  tabsContentKey,
  tabsContentProps,
}: FullApplicantDetailMainContentProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 border-t bg-card flex-1 min-h-0">
      <div className="lg:col-span-8 border-r border-border bg-muted/50 flex flex-col min-h-0 pointer-events-auto">
        <div className="w-full h-full flex flex-col min-h-0 pointer-events-auto">
          <FullApplicantDetailTabsNav
            activeTab={activeTab}
            isJobMatchEnabled={isJobMatchEnabled}
            jobMatchCount={jobMatchCount}
            educationCount={educationCount}
            experienceDuration={experienceDuration}
            onTabChange={onTabChange}
          />

          <div className={cn("flex-1 overflow-y-auto bg-secondary/50 h-full pointer-events-auto", isMobile ? "p-4 pb-48" : "p-8")}>
            <form id="applicant-edit-form" onSubmit={onSubmit} className="h-full">
              <ApplicantTabsContent key={tabsContentKey} {...tabsContentProps} />
            </form>
          </div>
        </div>
      </div>

      <div className={cn("flex flex-col min-h-0 pointer-events-auto", isMobile ? "lg:col-span-12 border-t border-border pb-48" : "lg:col-span-4")}>
        <ApplicantSidebar {...sidebarProps} />
      </div>
    </div>
  );
}
