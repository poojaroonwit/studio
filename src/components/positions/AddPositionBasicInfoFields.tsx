"use client";

import { Controller } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { AddPositionBasicInfoSectionProps } from './AddPositionModalSectionTypes';

interface AddPositionTextFieldProps {
  disabled: boolean;
  error?: string;
  id: string;
  label: string;
  placeholder: string;
  registration: ReturnType<AddPositionBasicInfoSectionProps['form']['register']>;
}

export function AddPositionTextField({
  disabled,
  error,
  id,
  label,
  placeholder,
  registration,
}: AddPositionTextFieldProps) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
      <Label htmlFor={id} className="font-medium text-sm">{label}</Label>
      <div>
        <Input
          id={id}
          placeholder={placeholder}
          {...registration}
          disabled={disabled}
        />
        {error && (
          <p className="text-sm text-destructive mt-1">{error}</p>
        )}
      </div>
    </div>
  );
}

export function AddPositionLevelField({
  form,
  isLoadingLevels,
  isSaving,
  positionLevels,
}: Pick<AddPositionBasicInfoSectionProps, 'form' | 'isLoadingLevels' | 'isSaving' | 'positionLevels'>) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
      <Label htmlFor="position-level-add" className="font-medium text-sm">Position Level *</Label>
      <div>
        <Controller
          name="positionLevel"
          control={form.control}
          render={({ field }) => (
            <Select value={field.value || 'none'} onValueChange={(value) => field.onChange(value === 'none' ? null : value)}>
              <SelectTrigger disabled={isSaving || isLoadingLevels}>
                <SelectValue placeholder={isLoadingLevels ? 'Loading levels...' : 'Select position level'} />
              </SelectTrigger>
              <SelectContent selectId="add-position-level-select">
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
            </Select>
          )}
        />
        {form.formState.errors.positionLevel && (
          <p className="text-sm text-destructive mt-1">{form.formState.errors.positionLevel.message}</p>
        )}
      </div>
    </div>
  );
}

export function AddPositionGradeField({
  form,
  grades,
}: Pick<AddPositionBasicInfoSectionProps, 'form' | 'grades'>) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
      <Label htmlFor="grade-add" className="font-medium text-sm">Grade</Label>
      <Controller
        name="gradeId"
        control={form.control}
        render={({ field }) => (
          <Select value={field.value || 'none'} onValueChange={(value) => field.onChange(value === 'none' ? null : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a grade" />
            </SelectTrigger>
            <SelectContent selectId="add-position-grade-select">
              <SelectItem value="none">No Grade</SelectItem>
              {grades.map((grade) => (
                <SelectItem key={grade.id} value={grade.id}>
                  {grade.label || grade.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </div>
  );
}

export function AddPositionRecruiterField({
  availableRecruiter,
  form,
}: Pick<AddPositionBasicInfoSectionProps, 'availableRecruiter' | 'form'>) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
      <Label htmlFor="recruiter-add" className="font-medium text-sm">Assigned Recruiter</Label>
      <Controller
        name="recruiterId"
        control={form.control}
        render={({ field }) => (
          <Select value={field.value || 'none'} onValueChange={(value) => field.onChange(value === 'none' ? null : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a recruiter" />
            </SelectTrigger>
            <SelectContent selectId="add-position-recruiter-select">
              <SelectItem value="none">No Recruiter</SelectItem>
              {availableRecruiter.map((recruiter) => (
                <SelectItem key={recruiter.id} value={recruiter.id}>
                  {recruiter.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </div>
  );
}

export function AddPositionOpenSwitch({
  form,
}: Pick<AddPositionBasicInfoSectionProps, 'form'>) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
      <Label htmlFor="isOpen-add" className="font-medium text-sm">Position is Open</Label>
      <Controller
        name="isOpen"
        control={form.control}
        render={({ field }) => (
          <Switch
            checked={field.value}
            onCheckedChange={field.onChange}
          />
        )}
      />
    </div>
  );
}
