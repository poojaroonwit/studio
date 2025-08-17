import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CUSTOM_FIELD_TYPES } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Plus, Trash2, GripVertical, Eye, Edit, Settings, Palette, Filter, User, Building, FileText, Calendar, Shield, List, Info, Zap, Database } from 'lucide-react';
import { ColorPicker } from '@/components/ui/color-picker';
import { toast } from 'react-hot-toast';
import type { CustomFieldDefinition, CustomFieldType, CustomFieldOption, UserGroup } from '@/lib/types';
import { RoleSelector } from '@/components/settings/RoleSelector';
import { cn } from '@/lib/utils';

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

interface CustomFieldDrawerProps {
  open: boolean;
  definition?: CustomFieldDefinition | null;
  onClose: () => void;
  onSubmit: (data: CustomFieldFormValues) => Promise<void>;
  availableRoles?: UserGroup[];
}

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

export default function CustomFieldDrawer({ 
  open, 
  definition, 
  onClose, 
  onSubmit, 
  availableRoles = [] 
}: CustomFieldDrawerProps) {
  const isEdit = Boolean(definition);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<UserGroup[]>(availableRoles);
  const [activeTab, setActiveTab] = useState('basic');

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
    if (definition && open) {
      form.reset({
        model_name: definition.model_name,
        field_code: definition.field_code,
        label: definition.label,
        field_type: definition.field_type,
        attributeLabel: definition.attributeLabel || '',
        viewRoles: definition.viewRoles || [],
        editRoles: definition.editRoles || [],
        showInFilter: definition.showInFilter || false,
        showInCandidateDetail: definition.showInCandidateDetail || false,
        showInFullCandidateDetail: definition.showInFullCandidateDetail || false,
        showInTaskBoardFilter: definition.showInTaskBoardFilter || false,
        showInPositionSettings: definition.showInPositionSettings || false,
        is_required: definition.is_required || false,
        allowCustomOptions: definition.allowCustomOptions || false,
        sort_order: definition.sort_order || 0,
        options: definition.options || [],
      });
    } else if (!definition && open) {
      form.reset({
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
      });
    }
  }, [definition, open, form]);

  const handleSubmit = async (data: CustomFieldFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      toast.success(isEdit ? 'Custom field updated successfully' : 'Custom field created successfully');
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
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="h-full w-[40vw] max-w-[40vw] flex flex-col" style={{ width: '40vw', maxWidth: '40vw' }}>
        <SheetHeader className="border-b flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {isEdit ? 'Edit Custom Field' : 'Create Custom Field'}
          </SheetTitle>
          <SheetDescription>
            Configure custom attributes for {watchModelName.toLowerCase()}s with advanced settings and permissions.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Tab Navigation - Following system settings pattern */}
          <div className="flex w-full border-b border-border/50 mb-6 flex-shrink-0">
            <div
              onClick={() => setActiveTab('basic')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'basic'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <FileText className="h-4 w-4" />
              Basic Info
            </div>
            <div
              onClick={() => setActiveTab('permissions')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'permissions'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <Shield className="h-4 w-4" />
              Permissions
            </div>
            <div
              onClick={() => setActiveTab('visibility')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'visibility'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <Eye className="h-4 w-4" />
              Visibility
            </div>
            {isSelectType && (
              <div
                onClick={() => setActiveTab('options')}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                  activeTab === 'options'
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                <List className="h-4 w-4" />
                Options
              </div>
            )}
            <div
              onClick={() => setActiveTab('advanced')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'advanced'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <Zap className="h-4 w-4" />
              Advanced
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                
                {/* Basic Information Tab */}
                {activeTab === 'basic' && (
                  <div className="space-y-6">
                    <div>
                      <div className="mb-4">
                        <h3 className="flex items-center gap-2 text-lg font-semibold">
                          <FileText className="h-5 w-5 text-primary" />
                          Field Configuration
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Define the basic properties and type of your custom field
                        </p>
                      </div>
                      <div className="space-y-4">
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
                                Optional detailed label for the field
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-4">
                        <h3 className="flex items-center gap-2 text-lg font-semibold">
                          <Info className="h-5 w-5 text-primary" />
                          Field Properties
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Configure additional field properties and requirements
                        </p>
                      </div>
                      <div>
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
                                  This field must be filled when creating/editing {watchModelName.toLowerCase()}s
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Permissions Tab */}
                {activeTab === 'permissions' && (
                  <div className="space-y-6">
                    <div>
                      <div className="mb-4">
                        <h3 className="flex items-center gap-2 text-lg font-semibold">
                          <Shield className="h-5 w-5 text-primary" />
                          Role Permissions
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Control which user roles can view and edit this custom field
                        </p>
                      </div>
                      <div className="space-y-4">
                        {/* Permissions Table Header */}
                        <div className="grid grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg border">
                          <div className="font-medium text-sm">Role Name</div>
                          <div className="font-medium text-sm flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            View
                          </div>
                          <div className="font-medium text-sm flex items-center gap-2">
                            <Edit className="h-4 w-4" />
                            Edit
                          </div>
                        </div>

                        {/* Roles List */}
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {availableGroups.map((role) => (
                            <div key={role.id} className="grid grid-cols-3 gap-4 p-3 border rounded-lg hover:bg-muted/20 transition-colors">
                              <div className="flex items-center">
                                <span className="font-medium text-sm">{role.name}</span>
                                {role.description && (
                                  <span className="text-xs text-muted-foreground ml-2">({role.description})</span>
                                )}
                              </div>
                              
                              {/* View Permission Checkbox */}
                              <div className="flex items-center">
                                <FormField
                                  control={form.control}
                                  name="viewRoles"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(role.id) || false}
                                          onCheckedChange={(checked) => {
                                            const currentRoles = field.value || [];
                                            if (checked) {
                                              field.onChange([...currentRoles, role.id]);
                                            } else {
                                              field.onChange(currentRoles.filter(id => id !== role.id));
                                            }
                                          }}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>

                              {/* Edit Permission Checkbox */}
                              <div className="flex items-center">
                                <FormField
                                  control={form.control}
                                  name="editRoles"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(role.id) || false}
                                          onCheckedChange={(checked) => {
                                            const currentRoles = field.value || [];
                                            if (checked) {
                                              field.onChange([...currentRoles, role.id]);
                                            } else {
                                              field.onChange(currentRoles.filter(id => id !== role.id));
                                            }
                                          }}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Summary */}
                        <div className="p-3 bg-muted/20 rounded-lg border">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">View Permissions:</span>
                              <span className="text-muted-foreground ml-2">
                                {form.watch("viewRoles")?.length || 0} roles selected
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">Edit Permissions:</span>
                              <span className="text-muted-foreground ml-2">
                                {form.watch("editRoles")?.length || 0} roles selected
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Visibility Tab */}
                {activeTab === 'visibility' && (
                  <div className="space-y-6">
                    <div>
                      <div className="mb-4">
                        <h3 className="flex items-center gap-2 text-lg font-semibold">
                          <Filter className="h-5 w-5 text-primary" />
                          Display Settings
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Configure where this field appears throughout the application
                        </p>
                      </div>
                      <div className="space-y-4">
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
                      </div>
                    </div>
                  </div>
                )}

                {/* Options Tab - Only for Select/Multiselect types */}
                {activeTab === 'options' && isSelectType && (
                  <div className="space-y-6">
                    <div>
                      <div className="mb-4">
                        <h3 className="flex items-center gap-2 text-lg font-semibold">
                          <List className="h-5 w-5 text-primary" />
                          Field Options
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Define the available options for this select field
                        </p>
                      </div>
                      <div className="space-y-4">
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
                      </div>
                    </div>
                  </div>
                )}

                {/* Advanced Tab */}
                {activeTab === 'advanced' && (
                  <div className="space-y-6">
                    <div>
                      <div className="mb-4">
                        <h3 className="flex items-center gap-2 text-lg font-semibold">
                          <Settings className="h-5 w-5 text-primary" />
                          Display Settings
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Configure advanced display and ordering settings
                        </p>
                      </div>
                      <div>
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
                                Lower numbers appear first in lists and forms
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-4">
                        <h3 className="flex items-center gap-2 text-lg font-semibold">
                          <Database className="h-5 w-5 text-primary" />
                          Field Information
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Technical details about this custom field
                        </p>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Model</Label>
                            <p className="font-medium">{watchModelName}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Type</Label>
                            <p className="font-medium">{watchFieldType.replace('_', ' ').toUpperCase()}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Required</Label>
                            <p className="font-medium">{form.watch("is_required") ? "Yes" : "No"}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Options Count</Label>
                            <p className="font-medium">{isSelectType ? optionsFields.length : "N/A"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </Form>
          </ScrollArea>
        </div>

        <SheetFooter className="border-t flex-shrink-0">
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={form.handleSubmit(handleSubmit)} 
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Saving...' : (isEdit ? 'Update Field' : 'Create Field')}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
