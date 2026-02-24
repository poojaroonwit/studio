"use client";

import React from 'react';
import { Controller, UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MobileSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/mobile-select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TiptapEditorWithExpand } from '@/components/ui/wysiwyg-editors';
import { PositionCustomFieldDisplay } from './PositionCustomFieldDisplay';
import { PositionCustomFieldEdit } from './PositionCustomFieldEdit';
import { cn, sanitizeHtml, sanitizeRichHtml } from '@/lib/utils';
import { getPositionStatusBadge } from '@/lib/positionUtils';
import { Briefcase, Edit, Loader2, Save, XCircle, BrainCircuit, FileText } from 'lucide-react';
import type { Position, Grade } from '@/lib/types';
import type { EditPositionFormValues } from './PositionDetailDrawer';

interface DetailsTabProps {
  position: Position;
  isEditMode: boolean;
  isSaving: boolean;
  isDrawerReady: boolean;
  isLoadingLevels: boolean;
  positionLevels: Array<{ id: string; name: string; color?: string }>;
  grades: Grade[];
  form: UseFormReturn<EditPositionFormValues>;
  isMobile: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (data: EditPositionFormValues) => Promise<void>;
  onCustomFieldChange: (fieldCode: string, value: any) => void;
}

export function DetailsTab({
  position,
  isEditMode,
  isSaving,
  isDrawerReady,
  isLoadingLevels,
  positionLevels,
  grades,
  form,
  isMobile,
  onEdit,
  onCancel,
  onSave,
  onCustomFieldChange,
}: DetailsTabProps) {
  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className={cn(isMobile ? "p-4 pb-10" : "p-6")}>
          <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
            {/* Header with Edit Button */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <Briefcase className="h-6 w-6 text-primary" />
                  Position Details
                </h2>
                <p className="mt-2 text-muted-foreground">
                  {isEditMode ? 'Edit position information' : 'View position details'}
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

            {/* Position Information Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Position Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Position Title *</Label>
                {isEditMode ? (
                  <Controller
                    name="title"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="Enter position title"
                        className={form.formState.errors.title ? 'border-red-500' : ''}
                      />
                    )}
                  />
                ) : (
                  <div className="text-base font-medium">{position.title}</div>
                )}
                {form.formState.errors.title && (
                  <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
                )}
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                {isEditMode ? (
                  <Controller
                    name="department"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="Enter department"
                        className={form.formState.errors.department ? 'border-red-500' : ''}
                      />
                    )}
                  />
                ) : (
                  <div className="text-base">{position.department}</div>
                )}
                {form.formState.errors.department && (
                  <p className="text-sm text-red-500">{form.formState.errors.department.message}</p>
                )}
              </div>

              {/* Position Level */}
              <div className="space-y-2">
                <Label htmlFor="positionLevel">Position Level</Label>
                {isEditMode ? (
                  <Controller
                    name="positionLevel"
                    control={form.control}
                    render={({ field }) => (
                      <MobileSelect
                        onValueChange={(value: string) => field.onChange(value === 'none' ? null : value)}
                        value={field.value || 'none'}
                        placeholder="Select Position Level"
                        selectId="position-level-select"
                      >
                        <SelectTrigger disabled={isLoadingLevels}>
                          <SelectValue placeholder={isLoadingLevels ? "Loading levels..." : "Select level"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Level</SelectItem>
                          {positionLevels.map((level) => (
                            <SelectItem key={level.id} value={level.name}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: level.color || '#6B7280' }}
                                />
                                {level.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </MobileSelect>
                    )}
                  />
                ) : (
                  <div className="text-base">{position.positionLevel || 'Not specified'}</div>
                )}
              </div>

              {/* Grade */}
              <div className="space-y-2">
                <Label htmlFor="gradeId">Grade</Label>
                {isEditMode ? (
                  <Controller
                    name="gradeId"
                    control={form.control}
                    render={({ field }) => (
                      <MobileSelect
                        onValueChange={(value: string) => field.onChange(value === 'none' ? null : value)}
                        value={field.value || 'none'}
                        placeholder="Select Grade"
                        selectId="grade-select"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Grade</SelectItem>
                          {grades.map((grade) => (
                            <SelectItem key={grade.id} value={grade.id}>
                              {grade.label || grade.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </MobileSelect>
                    )}
                  />
                ) : (
                  position.gradeId && position.grade ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{
                            borderColor: position.grade.color || '#3B82F6',
                            color: position.grade.color || '#3B82F6'
                          }}
                        >
                          {position.grade.name}
                        </Badge>
                        {position.grade.label && (
                          <span className="text-sm text-muted-foreground">
                            {position.grade.label}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <Badge variant="outline" className="ml-2 text-xs text-muted-foreground border-muted-foreground/50 bg-muted/20">
                      No Grade
                    </Badge>
                  )
                )}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="isOpen">Status</Label>
                {isEditMode ? (
                  <Controller
                    name="isOpen"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <span className="text-sm">
                          {field.value ? 'Open' : 'Closed'}
                        </span>
                      </div>
                    )}
                  />
                ) : (
                  <div className="text-base">
                    {(() => {
                      const statusBadge = getPositionStatusBadge(position.isOpen, false);
                      return (
                        <Badge
                          variant={statusBadge.variant}
                          className={statusBadge.className}
                        >
                          {statusBadge.text}
                        </Badge>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>



            {/* Custom Fields for Details Section */}
            {isEditMode ? (
              <PositionCustomFieldEdit
                section="details"
                positionId={position?.id || ''}
                customFields={position?.customFields || {}}
                onFieldChange={onCustomFieldChange}
                title="Additional Position Information"
              />
            ) : (
              <PositionCustomFieldDisplay
                section="details"
                positionId={position?.id || ''}
                customFields={position?.customFields || {}}
                title="Additional Position Information"
              />
            )}
          </form>
        </div>
      </ScrollArea>
    </div>
  );
}

