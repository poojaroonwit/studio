import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { JobAppliedTab } from './tabs/JobAppliedTab';
import { JobMatchTab } from './tabs/JobMatchTab';
import { ApplicantInfoTab } from './tabs/ApplicantInfoTab';
import { ContactTab } from './tabs/ContactTab';
import { EducationTab } from './tabs/EducationTab';
import { ExperienceTab } from './tabs/ExperienceTab';
import { useJobMatchFeature } from '@/hooks/useJobMatchFeature';

import type { Applicant, Position } from '@/lib/types';

interface ApplicantTabsContentProps {
  activeTab: string;
  applicant: Applicant;
  allDbPositions: Position[];
  isEditing: boolean;
  applicantJobMatches: any[];
  onJobMatchClick: (jobMatch: any) => void;
  onCopyJobMatch: (match: any, index: number) => void;
  copiedJobMatchIndex: number | null;
  onCopyJobApplied: () => void;
  copiedJobApplied: boolean;
  appliedJobId: string | null;
  appliedFitScore: number | null;
  appliedJustification: string[];
  appliedJobBadge: React.ReactNode;
  onOpenPositionDrawer: (positionId: string) => void;
  // Form props
  register?: any;
  errors?: any;
  watch?: any;
  setValue?: any;
  control?: any;
  educationFields?: any[];
  appendEducation?: (value: any) => void;
  removeEducation?: (index: number) => void;
  experienceFields?: any[];
  appendExperience?: (value: any) => void;
  removeExperience?: (index: number) => void;
  skillsFields?: any[];
  appendSkill?: (value: any) => void;
  removeSkill?: (index: number) => void;
  // Optional job suitable props (may not be used depending on feature flags)
  jobSuitableFields?: any[];
  appendJobSuitable?: (value: any) => void;
  removeJobSuitable?: (index: number) => void;
  jobMatchesFields?: any[];
  appendJobMatch?: (value: any) => void;
  removeJobMatch?: (index: number) => void;
  // Duration calculation functions
  calculateTotalExperienceDuration?: (experience: any[]) => string;
  // Comments and resumes props
  comments?: any[];
  resumes?: any[];
  onRefresh?: () => void;
  onCustomFieldChange?: (fieldCode: string, value: any) => void;
  customFieldsRefreshTrigger?: number;
}

export const ApplicantTabsContent: React.FC<ApplicantTabsContentProps> = ({
  activeTab,
  applicant,
  allDbPositions,
  isEditing,
  applicantJobMatches,
  onJobMatchClick,
  onCopyJobMatch,
  copiedJobMatchIndex,
  onCopyJobApplied,
  copiedJobApplied,
  appliedJobId,
  appliedFitScore,
  appliedJustification,
  appliedJobBadge,
  onOpenPositionDrawer,
  // Form props
  register,
  errors,
  watch,
  setValue,
  control,
  educationFields,
  appendEducation,
  removeEducation,
  experienceFields,
  appendExperience,
  removeExperience,
  skillsFields,
  appendSkill,
  removeSkill,
  // Optional job suitable props (unused in this component for now)
  jobSuitableFields,
  appendJobSuitable,
  removeJobSuitable,
  jobMatchesFields,
  appendJobMatch,
  removeJobMatch,
  // Duration calculation functions
  calculateTotalExperienceDuration,
  // Comments and resumes props
  comments = [],
  resumes = [],
  onRefresh,
  onCustomFieldChange,
  customFieldsRefreshTrigger
}) => {
  const { isJobMatchEnabled } = useJobMatchFeature();

  return (
    <div className="h-full bg-secondary/50">
      {/* Jobs Tab (Combined Job Applied and Job Match) */}
      {activeTab === 'jobs' && (
        <div className="space-y-4 h-full">
          <JobAppliedTab
            applicant={applicant}
            allDbPositions={allDbPositions}
            isEditing={isEditing}
            onCopyJobApplied={onCopyJobApplied}
            copiedJobApplied={copiedJobApplied}
            appliedJobId={appliedJobId}
            appliedFitScore={appliedFitScore}
            appliedJustification={appliedJustification}
            appliedJobBadge={appliedJobBadge}
            onOpenPositionDrawer={onOpenPositionDrawer}
            onCustomFieldChange={onCustomFieldChange}
            hideApplicantDetails={true}
            resumes={resumes}
          />
          {isJobMatchEnabled && (
            <JobMatchTab
              applicant={applicant}
              allDbPositions={allDbPositions}
              isEditing={isEditing}
              applicantJobMatches={applicantJobMatches}
              onJobMatchClick={onJobMatchClick}
              onCopyJobMatch={onCopyJobMatch}
              copiedJobMatchIndex={copiedJobMatchIndex}
            />
          )}
        </div>
      )}

      {/* Applicant Info Tab (includes Contact) */}
      {activeTab === 'applicant-info' && (
        <div className="space-y-4 h-full">
          <ApplicantInfoTab
            applicant={applicant}
            isEditing={isEditing}
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
            control={control}
          />
          <ContactTab
            applicant={applicant}
            isEditing={isEditing}
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
            skillsFields={skillsFields}
            appendSkill={appendSkill}
            removeSkill={removeSkill}
            onCustomFieldChange={onCustomFieldChange}
            customFieldsRefreshTrigger={customFieldsRefreshTrigger}
          />
        </div>
      )}

      {/* Education Tab */}
      {activeTab === 'education' && (
        <div className="space-y-4 h-full">
          <EducationTab
            applicant={applicant}
            isEditing={isEditing}
            control={control}
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
            educationFields={educationFields}
            appendEducation={appendEducation}
            removeEducation={removeEducation}
            onCustomFieldChange={onCustomFieldChange}
          />
        </div>
      )}

      {/* Experience Tab */}
      {activeTab === 'experience' && (
        <div className="space-y-4 h-full">
          <ExperienceTab
            applicant={applicant}
            isEditing={isEditing}
            control={control}
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
            experienceFields={experienceFields}
            appendExperience={appendExperience}
            removeExperience={removeExperience}
            calculateTotalExperienceDuration={calculateTotalExperienceDuration}
            onCustomFieldChange={onCustomFieldChange}
          />
        </div>
      )}





    </div>
  );
};
