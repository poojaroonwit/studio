import { type UseFormReturn } from 'react-hook-form';
import type { Grade, Position } from '@/lib/types';
import type { EditPositionFormValues } from './position-edit-form';
import {
  PositionGradeFieldRow,
  PositionLevelFieldRow,
  PositionRecruiterFieldRow,
  PositionStatusFieldRow,
  PositionTextFieldRow,
} from './PositionDetailsFieldRows';

export interface PositionDetailsFieldsProps {
  availableRecruiters: Array<{ id: string; name: string }>;
  form: UseFormReturn<EditPositionFormValues>;
  grades: Grade[];
  isEditMode: boolean;
  isLoadingLevels: boolean;
  position: Position;
  positionLevels: Array<{ id: string; name: string; color?: string }>;
}

export function PositionDetailsFields({
  availableRecruiters,
  form,
  grades,
  isEditMode,
  isLoadingLevels,
  position,
  positionLevels,
}: PositionDetailsFieldsProps) {
  return (
    <div className="space-y-4 bg-muted/20 p-4 rounded-lg border border-border/50">
      <PositionTextFieldRow
        displayValue={<div className="text-base font-bold text-foreground">{position.title}</div>}
        errorMessage={form.formState.errors.title?.message}
        form={form}
        isEditMode={isEditMode}
        label="Position Title *"
        name="title"
        placeholder="Enter position title"
      />
      <PositionTextFieldRow
        displayValue={<div className="text-base text-foreground">{position.department}</div>}
        errorMessage={form.formState.errors.department?.message}
        form={form}
        isEditMode={isEditMode}
        label="Department *"
        name="department"
        placeholder="Enter department"
      />
      <PositionLevelFieldRow
        form={form}
        isEditMode={isEditMode}
        isLoadingLevels={isLoadingLevels}
        position={position}
        positionLevels={positionLevels}
      />
      <PositionGradeFieldRow
        form={form}
        grades={grades}
        isEditMode={isEditMode}
        position={position}
      />
      <PositionRecruiterFieldRow
        availableRecruiters={availableRecruiters}
        form={form}
        isEditMode={isEditMode}
        position={position}
      />
      <PositionStatusFieldRow form={form} isEditMode={isEditMode} position={position} />
    </div>
  );
}
