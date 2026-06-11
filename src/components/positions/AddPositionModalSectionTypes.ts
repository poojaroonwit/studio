import type { UseFormReturn } from 'react-hook-form';

import type { Grade, PositionLevel } from '@/lib/types';

import type { AddPositionFormValues } from './add-position-form';
import type { AddPositionRecruiterOption } from './add-position-modal-utils';

export interface AddPositionBasicInfoSectionProps {
  availableRecruiter: AddPositionRecruiterOption[];
  form: UseFormReturn<AddPositionFormValues>;
  grades: Grade[];
  isLoadingLevels: boolean;
  isSaving: boolean;
  positionLevels: PositionLevel[];
}

export interface AddPositionDescriptionSectionProps {
  canGenerateDescription: boolean;
  form: UseFormReturn<AddPositionFormValues>;
  isGeneratingDescription: boolean;
  isModalReady: boolean;
  onGenerateJobDescription: () => void;
}

export interface AddPositionCriteriaSectionProps {
  defaultMatchCriteria: string;
  form: UseFormReturn<AddPositionFormValues>;
  isLoadingDefaultCriteria: boolean;
  isModalReady: boolean;
}
