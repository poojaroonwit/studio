"use client";

import { Briefcase } from 'lucide-react';

import type { AddPositionBasicInfoSectionProps } from './AddPositionModalSectionTypes';
import {
  AddPositionGradeField,
  AddPositionLevelField,
  AddPositionOpenSwitch,
  AddPositionRecruiterField,
  AddPositionTextField,
} from './AddPositionBasicInfoFields';

export function AddPositionBasicInfoSection({
  availableRecruiter,
  form,
  grades,
  isLoadingLevels,
  isSaving,
  positionLevels,
}: AddPositionBasicInfoSectionProps) {
  return (
    <div className="space-y-6 bg-muted/30 p-4 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <Briefcase className="h-4 w-4 text-primary" />
        <h3 className="font-medium text-sm">Basic Information</h3>
      </div>

      <AddPositionTextField
        disabled={isSaving}
        error={form.formState.errors.title?.message}
        id="title-add"
        label="Position Title *"
        placeholder="Enter position title"
        registration={form.register('title')}
      />

      <AddPositionTextField
        disabled={isSaving}
        error={form.formState.errors.department?.message}
        id="department-add"
        label="Department *"
        placeholder="Enter department"
        registration={form.register('department')}
      />

      <AddPositionLevelField
        form={form}
        isLoadingLevels={isLoadingLevels}
        isSaving={isSaving}
        positionLevels={positionLevels}
      />

      <AddPositionGradeField form={form} grades={grades} />

      <AddPositionRecruiterField
        availableRecruiter={availableRecruiter}
        form={form}
      />

      <AddPositionOpenSwitch form={form} />
    </div>
  );
}
