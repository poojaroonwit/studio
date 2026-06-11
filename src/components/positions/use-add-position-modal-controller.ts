import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { usePositionLevels } from '@/hooks/use-position-levels';

import {
  ADD_POSITION_DEFAULT_VALUES,
  addPositionFormSchema,
  type AddPositionFormValues,
} from './add-position-form';
import { useAddPositionDescriptionGenerator } from './use-add-position-description-generator';
import { useAddPositionReferenceData } from './use-add-position-reference-data';

interface UseAddPositionModalControllerInput {
  isOpen: boolean;
  onAddPosition: (data: AddPositionFormValues) => Promise<void>;
}

export function useAddPositionModalController({
  isOpen,
  onAddPosition,
}: UseAddPositionModalControllerInput) {
  const [isModalReady, setIsModalReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { levels: positionLevels, isLoading: isLoadingLevels } = usePositionLevels();

  const form = useForm<AddPositionFormValues>({
    resolver: zodResolver(addPositionFormSchema),
    defaultValues: ADD_POSITION_DEFAULT_VALUES,
  });

  const referenceData = useAddPositionReferenceData({ form, isOpen });
  const descriptionGenerator = useAddPositionDescriptionGenerator(form);

  const onSubmit = async (data: AddPositionFormValues) => {
    setIsSaving(true);
    try {
      await onAddPosition(data);
    } catch (err) {
      console.error('Error adding position:', err);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setIsModalReady(false);
      return;
    }

    setIsModalReady(true);
    form.reset(ADD_POSITION_DEFAULT_VALUES);
  }, [form, isOpen]);

  return {
    availableRecruiter: referenceData.availableRecruiter,
    canGenerateDescription: descriptionGenerator.canGenerateDescription,
    defaultMatchCriteria: referenceData.defaultMatchCriteria,
    form,
    generateJobDescription: descriptionGenerator.generateJobDescription,
    grades: referenceData.grades,
    handleConfirmReplace: descriptionGenerator.handleConfirmReplace,
    isGeneratingDescription: descriptionGenerator.isGeneratingDescription,
    isLoadingDefaultCriteria: referenceData.isLoadingDefaultCriteria,
    isLoadingLevels,
    isModalReady,
    isSaving,
    onSubmit,
    positionLevels,
    setShowReplaceConfirmation: descriptionGenerator.setShowReplaceConfirmation,
    showReplaceConfirmation: descriptionGenerator.showReplaceConfirmation,
  };
}
