import type { UseFormReturn } from 'react-hook-form';

import type { Grade, Position } from '@/lib/types';

import type { EditPositionFormValues } from './position-edit-form';

export interface PositionDetailsRowOptions {
  availableRecruiters: Array<{ id: string; name: string }>;
  form: UseFormReturn<EditPositionFormValues>;
  grades: Grade[];
  isEditMode: boolean;
  isLoadingLevels: boolean;
  position: Position;
  positionLevels: Array<{ id: string; name: string; color?: string }>;
}
