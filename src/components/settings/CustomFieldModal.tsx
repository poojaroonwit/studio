import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CUSTOM_FIELD_TYPES } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, GripVertical, Eye, Edit, Settings, Palette, Filter, User, Building, FileText, Calendar, Shield, List } from 'lucide-react';
import { ColorPicker } from '@/components/ui/color-picker';
import { toast } from 'react-hot-toast';
import type { CustomFieldDefinition, CustomFieldType, CustomFieldOption, UserGroup } from '@/lib/types';
import { RoleSelector } from '@/components/settings/RoleSelector';

const customFieldOptionSchema = z.object({
  id: z.string().optional(),
  value: z.string().min(1, "Option value is required"),
  label: z.string().min(1, "Option label is required"),
  color: z.string().optional(),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true),
});

const customFieldFormSchema = z.object({
  model_name: z.enum(['Candidate', 'Position', 'User', 'Headcount'], { required_error: "Model is required" }),
  field_code: z.string().min(1, "Field code is required").regex(/^[A-Z0-9_]+$/, "Code must be uppercase alphanumeric with underscores."),
  label: z.string().min(1, "Label is required"),
  field_type: z.enum(CUSTOM_FIELD_TYPES as [CustomFieldType, ...CustomFieldType[]], { required_error: "Field type is required" }),
  attributeLabel: z.string().optional(),
  
  // Role permissions - using role IDs
  viewRoles: z.array(z.string().uuid()).default([]),
  editRoles: z.array(z.string().uuid()).default([]),
  
  // Visibility settings
  showInFilter: z.boolean().default(false),
  showInCandidateDetail: z.boolean().default(false),
  showInFullCandidateDetail: z.boolean().default(false),
  showInTaskBoardFilter: z.boolean().default(false),
  showInPositionSettings: z.boolean().default(false),
  showInHeadcountDetail: z.boolean().default(false),
  
  // Field properties
  is_required: z.boolean().default(false),
  allowCustomOptions: z.boolean().default(false),
  sort_order: z.number().default(0),
  
  // Options for select/multiselect
  options: z.array(customFieldOptionSchema).optional().default([]),
});

type CustomFieldFormValues = z.infer<typeof customFieldFormSchema>;

interface CustomFieldModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CustomFieldFormValues) => Promise<void>;
  availableRoles?: UserGroup[];
}

// Default empty array - will be populated from props

const FIELD_TYPE_ICONS = {
  text: FileText,
  textarea: FileText,
  number: FileText,
  boolean: FileText,
  date: Calendar,
  select_single: FileText,
  select_multiple: FileText,
};

const MODEL_ICONS = {
  Candidate: User,
  Position: Building,
  User: User,
  Headcount: Building,
};

export default function CustomFieldModal({ 
  open, 
  onClose, 
  onSubmit, 
  availableRoles = [] 
}: CustomFieldModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<UserGroup[]>(availableRoles);

  // Fetch available roles if not provided
  useEffect(() => {
    if (availableRoles.length === 0) {
      fetchAvailableRoles();
    } else {
      setAvailableGroups(availableRoles);
    }
  }, [availableRoles]);

  const fetchAvailableRoles = async () => {
    try {
      const response = await fetch('/api/settings/user-groups');
      if (response.ok) {
        const roles = await response.json();
        setAvailableGroups(roles);
      }
    } catch (error) {
      console.error('Failed to fetch available roles:', error);
      toast.error('Failed to load available roles');
    }
  };

  const form = useForm<CustomFieldFormValues>({
    resolver: zodResolver(customFieldFormSchema),
    defaultValues: {
      model_name: 'Candidate',
      field_code: '',
      label: '',
      field_type: 'text',
      attributeLabel: '',
      viewRoles: [],
      editRoles: [],
      showInFilter: false,
      showInCandidateDetail: false,
      showInFullCandidateDetail: false,
      showInTaskBoardFilter: false,
      showInPositionSettings: false,
      is_required: false,
      allowCustomOptions: false,
      sort_order: 0,
      options: [],
    },
  });

  const { fields: optionsFields, append: appendOption, remove: removeOption, update: updateOption } = useFieldArray({
    control: form.control,
    name: "options"
  });

  const watchFieldType = form.watch("field_type");
  const watchModelName = form.watch("model_name");
  const isSelectType = watchFieldType === 'select_single' || watchFieldType === 'select_multiple';

  useEffect(() => {
    if (open) {
      form.reset({
        model_name: 'Candidate',
        field_key: '',
        label: '',
        field_type: 'text',
        attributeCode: '',
        attributeLabel: '',
        viewRoles: [],
        editRoles: [],
        showInFilter: false,
        showInCandidateDetail: false,
        showInFullCandidateDetail: false,
        showInTaskBoardFilter: false,
        showInPositionSettings: false,
        is_required: false,
        allowCustomOptions: false,
        sort_order: 0,
        options: [],
      });
    }
  }, [open, form]);

  const handleSubmit = async (data: CustomFieldFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      toast.success('Custom field created successfully');
      onClose();
    } catch (error) {
      console.error('Error submitting custom field:', error);
      toast.error('Failed to save custom field');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addOption = () => {
    appendOption({
      value: '',
      label: '',
      color: '#3B82F6',
      sortOrder: optionsFields.length,
      isActive: true,
    });
  };

  const removeOptionField = (index: number) => {
    removeOption(index);
  };

  const updateOptionField = (index: number, field: keyof CustomFieldOption, value: any) => {
    updateOption(index, { ...optionsFields[index], [field]: value });
  };

  const ModelIcon = MODEL_ICONS[watchModelName as keyof typeof MODEL_ICONS] || User;
  const FieldTypeIcon = FIELD_TYPE_ICONS[watchFieldType as keyof typeof FIELD_TYPE_ICONS] || FileText;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Create Custom Field
          </DialogTitle>
          <DialogDescription>
            Configure custom attributes for {watchModelName.toLowerCase()}s with advanced settings and permissions.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
              
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="model_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <ModelIcon className="h-4 w-4" />
                            Model Type
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select model type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Candidate">Candidate</SelectItem>
                              <SelectItem value="Position">Position</SelectItem>
                              <SelectItem value="User">User</SelectItem>
                              <SelectItem value="Headcount">Headcount</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="field_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <FieldTypeIcon className="h-4 w-4" />
                            Field Type
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select field type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CUSTOM_FIELD_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type.replace('_', ' ').toUpperCase()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="field_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Field Code</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., CUSTOM_STATUS" {...field} />
                          </FormControl>
                          <FormDescription>
                            Unique identifier (uppercase, alphanumeric, underscores only)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="label"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Label</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Custom Status" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="attributeLabel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Attribute Label</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Custom Status Attribute" {...field} />
                          </FormControl>
                          <FormDescription>
                            Optional detailed label
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <FormField
                      control={form.control}
                      name="is_required"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Required Field</FormLabel>
                            <FormDescription>
                              This field must be filled when creating/editing
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Role Permissions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Role Permissions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="viewRoles"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            View Permissions
                          </FormLabel>
                          <FormControl>
                            <RoleSelector
                              availableRoles={availableGroups}
                              selectedRoleIds={field.value || []}
                              onRolesChange={field.onChange}
                              title="View Permissions"
                              description="Choose which roles can view this custom field."
                              multiple={true}
                              noCard={true}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="editRoles"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Edit className="h-4 w-4" />
                            Edit Permissions
                          </FormLabel>
                          <FormControl>
                            <RoleSelector
                              availableRoles={availableGroups}
                              selectedRoleIds={field.value || []}
                              onRolesChange={field.onChange}
                              title="Edit Permissions"
                              description="Choose which roles can edit this custom field."
                              multiple={true}
                              noCard={true}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Visibility Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Visibility Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="showInFilter"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Show in Filter</FormLabel>
                            <FormDescription>
                              Display this field in list filters
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="showInCandidateDetail"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Show in Candidate Detail</FormLabel>
                            <FormDescription>
                              Display in candidate detail view
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="showInFullCandidateDetail"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Show in Full Candidate Detail</FormLabel>
                            <FormDescription>
                              Display in full candidate detail page
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="showInTaskBoardFilter"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Show in Task Board Filter</FormLabel>
                            <FormDescription>
                              Display in task board filters
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    {watchModelName === 'Position' && (
                      <FormField
                        control={form.control}
                        name="showInPositionSettings"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Show in Position Settings</FormLabel>
                              <FormDescription>
                                Display in position settings page
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Options Management for Select/Multiselect */}
              {isSelectType && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <List className="h-4 w-4" />
                      Field Options
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <FormField
                          control={form.control}
                          name="allowCustomOptions"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Allow Custom Options</FormLabel>
                                <FormDescription>
                                  Users can add new options when using this field
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addOption}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Option
                      </Button>
                    </div>

                    {optionsFields.length > 0 && (
                      <div className="space-y-3">
                        <Label>Options</Label>
                        {optionsFields.map((option, index) => (
                          <div key={option.id} className="flex items-center gap-3 p-3 border rounded-lg">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                              <Input
                                placeholder="Value"
                                value={option.value}
                                onChange={(e) => updateOptionField(index, 'value', e.target.value)}
                              />
                              <Input
                                placeholder="Label"
                                value={option.label}
                                onChange={(e) => updateOptionField(index, 'label', e.target.value)}
                              />
                              <div className="flex items-center gap-2">
                                <ColorPicker
                                  value={option.color || '#3B82F6'}
                                  onChange={(color) => updateOptionField(index, 'color', color)}
                                />
                                <Input
                                  value={option.color || '#3B82F6'}
                                  onChange={(e) => updateOptionField(index, 'color', e.target.value)}
                                  className="w-20"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={option.isActive}
                                onCheckedChange={(checked) => updateOptionField(index, 'isActive', checked)}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeOptionField(index)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Sort Order */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Display Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="sort_order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sort Order</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Lower numbers appear first in lists
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={form.handleSubmit(handleSubmit)} 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Field'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
