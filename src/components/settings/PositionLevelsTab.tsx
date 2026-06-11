"use client";

import { PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { PositionLevelDeleteDialog } from './PositionLevelDeleteDialog';
import { PositionLevelFormDialog } from './PositionLevelFormDialog';
import { PositionLevelsList } from './PositionLevelsList';
import {
  PositionLevelsErrorState,
  PositionLevelsLoadingState,
} from './PositionLevelsTabStates';
import { usePositionLevelsTab } from './use-position-levels-tab';

export function PositionLevelsTab() {
  const tab = usePositionLevelsTab();

  if (tab.isLoading) {
    return <PositionLevelsLoadingState />;
  }

  if (tab.fetchError) {
    return (
      <PositionLevelsErrorState
        fetchError={tab.fetchError}
        onRetry={tab.loadLevels}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 space-y-6 pb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Position Level Management</h2>
            <p className="text-muted-foreground">
              Manage the list of standardized position levels used across positions.
            </p>
          </div>
          <Button onClick={() => tab.openModal()}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Position Level
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-4 custom-scrollbar">
        <PositionLevelsList
          levels={tab.levels}
          onDelete={tab.setLevelToDelete}
          onDragEnd={tab.handleDragEnd}
          onEdit={tab.openModal}
        />
      </div>

      <PositionLevelFormDialog
        editingLevel={tab.editingLevel}
        formData={tab.formData}
        isSubmitting={tab.isSubmitting}
        onClose={tab.closeModal}
        onFormDataChange={tab.setFormData}
        onOpenChange={tab.setIsModalOpen}
        onSubmit={tab.submitForm}
        open={tab.isModalOpen}
      />

      <PositionLevelDeleteDialog
        levelToDelete={tab.levelToDelete}
        onConfirm={tab.deleteSelectedLevel}
        onOpenChange={() => tab.setLevelToDelete(null)}
      />
    </div>
  );
}
