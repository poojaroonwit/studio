"use client";

import { Briefcase } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  AddPositionBasicInfoSection,
  AddPositionCriteriaSection,
  AddPositionDescriptionSection,
} from './AddPositionModalSections';
import { AddPositionReplaceDescriptionDialog } from './AddPositionReplaceDescriptionDialog';
import type { AddPositionFormValues } from './add-position-form';
import { useAddPositionModalController } from './use-add-position-modal-controller';

export type { AddPositionFormValues } from './add-position-form';

interface AddPositionModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddPosition: (data: AddPositionFormValues) => Promise<void>;
}

export function AddPositionModal({
  isOpen,
  onAddPosition,
  onOpenChange,
}: AddPositionModalProps) {
  const controller = useAddPositionModalController({ isOpen, onAddPosition });

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] flex flex-col p-0" dialogId="add-position-modal">
          <DialogHeader className="px-8 pt-8 pb-6 flex-shrink-0">
            <DialogTitle className="flex items-center">
              <Briefcase className="mr-2 h-5 w-5 text-primary" /> Add New Position
            </DialogTitle>
            <DialogDescription>
              Enter the details for the new job position.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={controller.form.handleSubmit(controller.onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="flex-1 px-8 pb-6 overflow-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-4">
                <AddPositionBasicInfoSection
                  availableRecruiter={controller.availableRecruiter}
                  form={controller.form}
                  grades={controller.grades}
                  isLoadingLevels={controller.isLoadingLevels}
                  isSaving={controller.isSaving}
                  positionLevels={controller.positionLevels}
                />

                <AddPositionDescriptionSection
                  canGenerateDescription={controller.canGenerateDescription}
                  form={controller.form}
                  isGeneratingDescription={controller.isGeneratingDescription}
                  isModalReady={controller.isModalReady}
                  onGenerateJobDescription={controller.generateJobDescription}
                />

                <AddPositionCriteriaSection
                  defaultMatchCriteria={controller.defaultMatchCriteria}
                  form={controller.form}
                  isLoadingDefaultCriteria={controller.isLoadingDefaultCriteria}
                  isModalReady={controller.isModalReady}
                />
              </div>
            </ScrollArea>

            <DialogFooter className="px-8 py-6 border-t flex-shrink-0">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={controller.form.formState.isSubmitting} variant="default">
                {controller.form.formState.isSubmitting ? 'Adding Position...' : 'Add Position'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AddPositionReplaceDescriptionDialog
        onConfirm={controller.handleConfirmReplace}
        onOpenChange={controller.setShowReplaceConfirmation}
        open={controller.showReplaceConfirmation}
      />
    </>
  );
}
