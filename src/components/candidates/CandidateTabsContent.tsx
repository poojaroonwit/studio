import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { JobAppliedTab } from './tabs/JobAppliedTab';
import { JobMatchTab } from './tabs/JobMatchTab';
import { CandidateInfoTab } from './tabs/CandidateInfoTab';
import { ContactTab } from './tabs/ContactTab';
import { EducationTab } from './tabs/EducationTab';
import { ExperienceTab } from './tabs/ExperienceTab';
import { JobSuitabilityTab } from './tabs/JobSuitabilityTab';


import type { Candidate, Position } from '@/lib/types';

interface CandidateTabsContentProps {
  activeTab: string;
  candidate: Candidate;
  allDbPositions: Position[];
  isEditing: boolean;
  candidateJobMatches: any[];
  onJobMatchClick: (jobMatch: any) => void;
  onCopyJobMatch: (match: any, index: number) => void;
  copiedJobMatchIndex: number | null;
  onCopyJobApplied: () => void;
  copiedJobApplied: boolean;
  appliedJobId: string | null;
  appliedFitScore: number | null;
  appliedJustification: string[];
  appliedJobBadge: React.ReactNode;
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
}

export const CandidateTabsContent: React.FC<CandidateTabsContentProps> = ({
  activeTab,
  candidate,
  allDbPositions,
  isEditing,
  candidateJobMatches,
  onJobMatchClick,
  onCopyJobMatch,
  copiedJobMatchIndex,
  onCopyJobApplied,
  copiedJobApplied,
  appliedJobId,
  appliedFitScore,
  appliedJustification,
  appliedJobBadge,
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
  onRefresh
}) => {
  return (
    <div className="h-full bg-background">
      {/* Jobs Tab (Combined Job Applied and Job Match) */}
      {activeTab === 'jobs' && (
        <div className="space-y-4 h-full">
          <JobAppliedTab
            candidate={candidate}
            allDbPositions={allDbPositions}
            isEditing={isEditing}
            onCopyJobApplied={onCopyJobApplied}
            copiedJobApplied={copiedJobApplied}
            appliedJobId={appliedJobId}
            appliedFitScore={appliedFitScore}
            appliedJustification={appliedJustification}
            appliedJobBadge={appliedJobBadge}
          />
          <JobMatchTab
            candidate={candidate}
            allDbPositions={allDbPositions}
            isEditing={isEditing}
            candidateJobMatches={candidateJobMatches}
            onJobMatchClick={onJobMatchClick}
            onCopyJobMatch={onCopyJobMatch}
            copiedJobMatchIndex={copiedJobMatchIndex}
          />
        </div>
      )}

      {/* Candidate Info Tab (includes Contact) */}
      {activeTab === 'candidate-info' && (
        <div className="space-y-4 h-full">
        <CandidateInfoTab
          candidate={candidate}
          isEditing={isEditing}
          register={register}
          errors={errors}
          watch={watch}
          setValue={setValue}
          control={control}
        />
        <ContactTab
          candidate={candidate}
          isEditing={isEditing}
          register={register}
          errors={errors}
          watch={watch}
          setValue={setValue}
          skillsFields={skillsFields}
          appendSkill={appendSkill}
          removeSkill={removeSkill}
        />
              </div>
      )}

      {/* Education Tab */}
      {activeTab === 'education' && (
        <div className="space-y-4 h-full">
        <EducationTab
          candidate={candidate}
          isEditing={isEditing}
          control={control}
          register={register}
          errors={errors}
          watch={watch}
          setValue={setValue}
          educationFields={educationFields}
          appendEducation={appendEducation}
          removeEducation={removeEducation}
        />
              </div>
      )}

      {/* Experience Tab */}
      {activeTab === 'experience' && (
        <div className="space-y-4 h-full">
        <ExperienceTab
          candidate={candidate}
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
        />
              </div>
      )}

      {/* Job Suitability Tab */}
      {activeTab === 'job-suitability' && (
        <div className="space-y-4 h-full">
        <JobSuitabilityTab
          candidate={candidate}
          isEditing={isEditing}
          control={control}
          register={register}
          errors={errors}
          watch={watch}
          setValue={setValue}
          jobSuitableFields={jobSuitableFields}
          appendJobSuitable={appendJobSuitable}
          removeJobSuitable={removeJobSuitable}
        />
              </div>
      )}



    </div>
  );
};
