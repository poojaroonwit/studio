"use client";

import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

import { GradeDeleteDialog } from "./GradeDeleteDialog";
import { GradeFormDialog } from "./GradeFormDialog";
import { GradesList } from "./GradesList";
import { GradesErrorState, GradesLoadingState } from "./GradesTabStates";
import { useGradesTab } from "./use-grades-tab";

export function GradesTab() {
  const tab = useGradesTab();

  if (tab.isLoading) {
    return <GradesLoadingState />;
  }

  if (tab.fetchError) {
    return (
      <GradesErrorState
        error={tab.fetchError}
        onRetry={tab.fetchGrades}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Grade Management</h2>
          <p className="text-muted-foreground">
            Configure position grades and their SLA requirements for hiring timelines.
          </p>
        </div>
        <Button onClick={() => tab.handleOpenModal()}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Grade
        </Button>
      </div>

      <GradesList
        grades={tab.grades}
        onDragEnd={tab.handleDragEnd}
        onEdit={tab.handleOpenModal}
        onDeleteRequest={tab.setGradeToDelete}
      />

      <GradeFormDialog
        editingGrade={tab.editingGrade}
        formData={tab.formData}
        isOpen={tab.isModalOpen}
        isSubmitting={tab.isSubmitting}
        onFormDataChange={tab.setFormData}
        onOpenChange={(open) => {
          if (open) {
            tab.setIsModalOpen(true);
          } else {
            tab.handleCloseModal();
          }
        }}
        onSubmit={tab.handleSubmit}
      />

      <GradeDeleteDialog
        grade={tab.gradeToDelete}
        onConfirm={tab.handleDelete}
        onOpenChange={(open) => {
          if (!open) {
            tab.setGradeToDelete(null);
          }
        }}
      />
    </div>
  );
}
