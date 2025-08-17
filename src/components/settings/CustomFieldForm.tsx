import React from 'react';
import type { CustomFieldDefinition, CustomFieldType, CustomFieldOption } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CUSTOM_FIELD_TYPES } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const customFieldOptionSchemaClient = z.object({
  value: z.string().min(1, "Option value is required"),
  label: z.string().min(1, "Option label is required"),
});

const customFieldFormSchema = z.object({
  model_name: z.enum(['Candidate', 'Position', 'User', 'Headcount'], { required_error: "Model is required" }),
  field_key: z.string().min(1, "Field key is required").regex(/^[a-z0-9_]+$/, "Key must be lowercase alphanumeric with underscores."),
  label: z.string().min(1, "Label is required"),
  field_type: z.enum(CUSTOM_FIELD_TYPES as [CustomFieldType, ...CustomFieldType[]], { required_error: "Field type is required" }),
  options: z.array(customFieldOptionSchemaClient).optional(),
  is_required: z.boolean().optional().default(false),
  sort_order: z.coerce.number().int().optional().default(0),
});

type CustomFieldFormValues = z.infer<typeof customFieldFormSchema>;

interface CustomFieldFormProps {
  open: boolean;
  definition: CustomFieldDefinition | null;
  onClose: () => void;
  onSubmit: (data: CustomFieldFormValues) => void;
}

const CustomFieldForm: React.FC<CustomFieldFormProps> = ({ open, definition, onClose, onSubmit }: CustomFieldFormProps) => {
  const isEdit = Boolean(definition);
  const form = useForm<CustomFieldFormValues>({
    resolver: zodResolver(customFieldFormSchema),
    defaultValues: definition ? {
      model_name: definition.model_name,
      field_key: definition.field_key,
      label: definition.label,
      field_type: definition.field_type,
      options: definition.options || [],
      is_required: definition.is_required || false,
      sort_order: definition.sort_order || 0,
    } : {
      model_name: 'Candidate',
      field_key: '',
      label: '',
      field_type: 'text',
      options: [],
      is_required: false,
      sort_order: 0,
    },
  });

  const { fields: optionsFields, append: appendOption, remove: removeOption, replace: replaceOptions } = useFieldArray({
    control: form.control,
    name: "options"
  });

  const watchFieldType = form.watch("field_type");

  React.useEffect(() => {
    if (definition) {
      form.reset({
        model_name: definition.model_name,
        field_key: definition.field_key,
        label: definition.label,
        field_type: definition.field_type,
        options: definition.options || [],
        is_required: definition.is_required || false,
        sort_order: definition.sort_order || 0,
      });
      replaceOptions(definition.options || []);
    } else {
      form.reset({ model_name: 'Candidate', field_key: '', label: '', field_type: 'text', options: [], is_required: false, sort_order: 0 });
      replaceOptions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition, open]);

  const handleSubmit = (data: CustomFieldFormValues) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit' : 'Add'} Custom Field</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Edit the custom field definition.' : 'Create a new custom field definition.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Model</label>
              <select {...form.register('model_name')} className="w-full border rounded p-2 bg-background">
                <option value="Candidate">Candidate</option>
                <option value="Position">Position</option>
                <option value="User">User</option>
                <option value="Headcount">Headcount</option>
              </select>
              {form.formState.errors.model_name && <span className="text-red-500 text-xs">{form.formState.errors.model_name.message as string}</span>}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Field Key</label>
              <input {...form.register('field_key')} className="w-full border rounded p-2 bg-background" placeholder="e.g. linkedin_url" />
              {form.formState.errors.field_key && <span className="text-red-500 text-xs">{form.formState.errors.field_key.message as string}</span>}
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Label</label>
              <input {...form.register('label')} className="w-full border rounded p-2 bg-background" placeholder="e.g. LinkedIn URL" />
              {form.formState.errors.label && <span className="text-red-500 text-xs">{form.formState.errors.label.message as string}</span>}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Field Type</label>
              <select {...form.register('field_type')} className="w-full border rounded p-2 bg-background">
                {CUSTOM_FIELD_TYPES.map(type => (
                  <option key={type} value={type}>{type.replace('_', ' ')}</option>
                ))}
              </select>
              {form.formState.errors.field_type && <span className="text-red-500 text-xs">{form.formState.errors.field_type.message as string}</span>}
            </div>
          </div>
          {(watchFieldType === 'select_single' || watchFieldType === 'select_multiple') && (
            <div>
              <label className="block text-sm font-medium mb-1">Options</label>
              <div className="space-y-2">
                {optionsFields.map((field, idx) => (
                  <div key={field.id} className="flex gap-2 items-center">
                    <input {...form.register(`options.${idx}.value` as const)} className="border rounded p-2 flex-1" placeholder="Value" />
                    <input {...form.register(`options.${idx}.label` as const)} className="border rounded p-2 flex-1" placeholder="Label" />
                    <button type="button" className="text-red-500 px-2" onClick={() => removeOption(idx)}>Remove</button>
                  </div>
                ))}
                <button type="button" className="text-blue-600 text-sm" onClick={() => appendOption({ value: '', label: '' })}>+ Add Option</button>
              </div>
              {form.formState.errors.options && <span className="text-red-500 text-xs">{(form.formState.errors.options as any)?.message}</span>}
            </div>
          )}
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <input type="checkbox" {...form.register('is_required')} id="is_required" />
              <label htmlFor="is_required" className="text-sm">Required</label>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Sort Order</label>
              <input type="number" {...form.register('sort_order', { valueAsNumber: true })} className="w-24 border rounded p-2" />
              {form.formState.errors.sort_order && <span className="text-red-500 text-xs">{form.formState.errors.sort_order.message as string}</span>}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" variant="default">{isEdit ? 'Update' : 'Create'} Field</Button>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomFieldForm; 