"use client";

import { zodResolver } from '@hookform/resolvers/zod';
import { useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import * as z from 'zod';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const teamAssignmentConditionValues = z.array(z.string().trim().min(1)).transform((values) =>
  values.map((value) => value.trim())
);

const teamAssignmentConditionsSchema = z.object({
  department: teamAssignmentConditionValues.optional().default([]),
  officeLocation: teamAssignmentConditionValues.optional().default([]),
  positionTitle: teamAssignmentConditionValues.optional().default([]),
  employeeType: teamAssignmentConditionValues.optional().default([]),
  companyName: teamAssignmentConditionValues.optional().default([]),
  manager: teamAssignmentConditionValues.optional().default([]),
});

export const teamFormSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  assignmentMode: z.enum(['manual', 'automatic']).optional().default('manual'),
  assignmentConditions: teamAssignmentConditionsSchema.optional().default({}),
}).refine(
  (team) => {
    if (team.assignmentMode !== 'automatic') {
      return true;
    }

    const { assignmentConditions } = team;
    return (
      (assignmentConditions.department?.length || 0) > 0
      || (assignmentConditions.officeLocation?.length || 0) > 0
      || (assignmentConditions.positionTitle?.length || 0) > 0
      || (assignmentConditions.employeeType?.length || 0) > 0
      || (assignmentConditions.companyName?.length || 0) > 0
      || (assignmentConditions.manager?.length || 0) > 0
    );
  },
  {
    message: 'Add at least one condition for automatic assignment mode.',
    path: ['assignmentConditions'],
  }
);

export type TeamFormValues = z.infer<typeof teamFormSchema>;

export const teamFormResolver = zodResolver(teamFormSchema);

export const EMPTY_TEAM_FORM_VALUES: TeamFormValues = {
  name: '',
  description: '',
  color: '#3B82F6',
  isActive: true,
  assignmentMode: 'manual',
  assignmentConditions: {},
};

const ASSIGNMENT_FIELD_LABELS: Array<{ key: keyof TeamFormValues['assignmentConditions']; label: string }> = [
  { key: 'department', label: 'Department' },
  { key: 'officeLocation', label: 'Office Location' },
  { key: 'positionTitle', label: 'Position Title' },
  { key: 'employeeType', label: 'Employee Type' },
  { key: 'companyName', label: 'Company Name' },
  { key: 'manager', label: 'Manager' },
];

function parseConditionLines(value: string): string[] {
  return value
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function joinConditionLines(values: string[] | undefined): string {
  return values?.join('\n') ?? '';
}

function StringArrayConditionsField({
  field,
  title,
  placeholder,
  canEdit,
  onValuesChange,
  isError,
}: {
  field: string[] | undefined;
  title: string;
  placeholder: string;
  canEdit: boolean;
  onValuesChange: (values: string[]) => void;
  isError?: boolean;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-muted-foreground/20 p-3">
      <p className="text-sm font-medium">{title}</p>
      <Textarea
        value={joinConditionLines(field || [])}
        onChange={(event) => {
          if (!canEdit) {
            return;
          }
          onValuesChange(parseConditionLines(event.target.value));
        }}
        placeholder={placeholder}
        rows={3}
        className="resize-y"
      />

      {!isError && canEdit && !field?.length && (
        <p className="text-xs text-muted-foreground">Add one value per line. Leave blank to skip this field.</p>
      )}
      {isError && canEdit && (
        <p className="text-xs text-destructive">Add at least one value in this or another field.</p>
      )}
    </div>
  );
}

function AssignmentConditionCard({
  form,
  canEdit = true,
}: {
  form: UseFormReturn<TeamFormValues>;
  canEdit?: boolean;
}) {
  const watchedMode = useWatch({
    control: form.control,
    name: 'assignmentMode',
    defaultValue: 'manual',
  });
  const assignmentMode = watchedMode || 'manual';

  const conditions: TeamFormValues['assignmentConditions'] = useWatch({
    control: form.control,
    name: 'assignmentConditions',
    defaultValue: {},
  });
  const hasAssignmentError = !!form.formState.errors.assignmentConditions;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="space-y-2">
        <FormLabel>Assignment Mode</FormLabel>
        <FormField
          control={form.control}
          name="assignmentMode"
          render={({ field }) => (
            <FormItem>
              <Select
                value={field.value || 'manual'}
                onValueChange={field.onChange}
                disabled={!canEdit}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignment mode" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="automatic">Automatic</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      </div>

      {assignmentMode === 'automatic' && (
        <div className="grid gap-3">
          {ASSIGNMENT_FIELD_LABELS.map(({ key, label }) => (
            <StringArrayConditionsField
              key={key}
              title={label}
              placeholder={`Enter ${label.toLowerCase()}...`}
              field={conditions?.[key] || []}
              canEdit={canEdit}
              isError={hasAssignmentError}
              onValuesChange={(value: string[]) => {
                form.setValue(`assignmentConditions.${key}`, value, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
            />
          ))}
        </div>
      )}
      {assignmentMode !== 'automatic' && (
        <p className="text-sm text-muted-foreground">Automatic mode is disabled. Users will only be assigned manually.</p>
      )}
    </div>
  );
}

export function TeamFormFields({
  form,
  showActiveStatus = false,
}: {
  form: UseFormReturn<TeamFormValues>;
  showActiveStatus?: boolean;
}) {
  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Team Name</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Enter team name" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea {...field} value={field.value ?? ''} placeholder="Enter team description" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="color"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Team Color</FormLabel>
            <FormControl>
              <Input
                value={field.value ?? '#3B82F6'}
                onChange={field.onChange}
                className="w-full"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="assignmentMode"
        render={() => null}
      />

      <FormField
        control={form.control}
        name="assignmentConditions"
        render={() => (
          <FormItem>
            <FormMessage />
          </FormItem>
        )}
      />

      <AssignmentConditionCard form={form} />

      {showActiveStatus && (
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active Status</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Enable or disable this team
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      )}
    </>
  );
}
