"use client";

import React from 'react';
import { Controller, UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TiptapEditorWithExpand } from '@/components/ui/wysiwyg-editors';
import { PositionCustomFieldDisplay } from './PositionCustomFieldDisplay';
import { PositionCustomFieldEdit } from './PositionCustomFieldEdit';
import { cn, sanitizeRichHtml } from '@/lib/utils';
import { FileText, Edit, Loader2, Save, XCircle, BrainCircuit } from 'lucide-react';
import type { Position } from '@/lib/types';
import type { EditPositionFormValues } from './PositionDetailDrawer';

interface JobDescriptionTabProps {
  position: Position;
  isEditMode: boolean;
  isSaving: boolean;
  isGeneratingDescription: boolean;
  isDrawerReady: boolean;
  form: UseFormReturn<EditPositionFormValues>;
  isMobile: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (data: EditPositionFormValues) => Promise<void>;
  onGenerateJobDescription: () => void;
  onCustomFieldChange: (fieldCode: string, value: any) => void;
}

export function JobDescriptionTab({
  position,
  isEditMode,
  isSaving,
  isGeneratingDescription,
  isDrawerReady,
  form,
  isMobile,
  onEdit,
  onCancel,
  onSave,
  onGenerateJobDescription,
  onCustomFieldChange,
}: JobDescriptionTabProps) {
  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className={cn(isMobile ? "p-4 pb-10" : "p-6")}>
          <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
            {/* Header with Edit Button */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  Job Description
                </h2>
                <p className="mt-2 text-muted-foreground">
                  {isEditMode ? 'Edit job description' : 'View job description'}
                </p>
              </div>
              {!isEditMode ? (
                <Button variant="outline" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save
                  </Button>
                </div>
              )}
            </div>

            {/* Job Description Content */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  Content
                </h3>
                {isEditMode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onGenerateJobDescription}
                    disabled={isGeneratingDescription}
                  >
                    {isGeneratingDescription ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <BrainCircuit className="h-4 w-4 mr-2" />
                    )}
                    Generate with AI
                  </Button>
                )}
              </div>

              <div className="border rounded-lg p-4">
                {isEditMode ? (
                  <Controller
                    name="description"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex-1 flex flex-col min-h-0">
                        <TiptapEditorWithExpand
                          value={field.value || ''}
                          onChange={field.onChange}
                          placeholder="Enter job description..."
                          className="flex-1 min-h-[400px]"
                          isOpen={isDrawerReady}
                          expandTitle="Edit Job Description"
                        />
                      </div>
                    )}
                  />
                ) : (
                  position.description ? (
                    <div
                      className="wysiwyg-content prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(position.description) }}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-muted-foreground">
                        <FileText className="h-12 w-12 mb-4 text-muted-foreground mx-auto" />
                        <h4 className="text-lg font-medium mb-2">No job description</h4>
                        <p className="text-sm">Click Edit to add a job description for this position.</p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Custom Fields for Description Section if any */}
            {isEditMode ? (
              <PositionCustomFieldEdit
                section="description"
                positionId={position?.id || ''}
                customFields={position?.customFields || {}}
                onFieldChange={onCustomFieldChange}
                title="Additional Description details"
              />
            ) : (
              <PositionCustomFieldDisplay
                section="description"
                positionId={position?.id || ''}
                customFields={position?.customFields || {}}
                title="Additional Description details"
              />
            )}
          </form>
        </div>
      </ScrollArea>
    </div>
  );
}
