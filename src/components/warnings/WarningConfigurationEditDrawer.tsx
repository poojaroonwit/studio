"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { 
  AlertTriangle, 
  Settings, 
  Plus, 
  Trash2, 
  Eye, 
  Clock, 
  Target,
  Hash,
  Calendar,
  Zap,
  Info,
  AlertCircle,
  AlertOctagon,
  ChevronDown,
  ChevronRight,
  Download,
  Upload,
  FileText,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Search,
  XCircle,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface WarningConfiguration {
  id: string;
  name: string;
  description?: string;
  entityType?: string;
  field?: string;
  condition?: string;
  operator?: string;
  value?: string;
  threshold?: number;
  severity: string;
  isActive: boolean;
  isPublic?: boolean;
  conditionGroups?: any[];
  groupsLogicalOperator?: 'AND' | 'OR';
}

interface WarningConfigurationEditDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  configuration: WarningConfiguration | null;
  userId: string;
}

const SEVERITIES = [
  { value: 'info', label: 'Info', icon: Info },
  { value: 'warning', label: 'Warning', icon: AlertTriangle },
  { value: 'error', label: 'Error', icon: AlertCircle },
  { value: 'critical', label: 'Critical', icon: AlertOctagon },
];

const ENTITY_TYPES = [
  { value: 'position', label: 'Position', icon: Target, description: 'Job positions and openings' },
  { value: 'candidate', label: 'Candidate', icon: Eye, description: 'Job candidates and applicants' },
  { value: 'headcount', label: 'Headcount', icon: Hash, description: 'Headcount planning and allocation' },
];

const CONDITION_TYPES = [
  { value: 'is_empty', label: 'Is Empty', icon: AlertTriangle, description: 'Field has no value' },
  { value: 'is_not_empty', label: 'Is Not Empty', icon: CheckCircle, description: 'Field has a value' },
  { value: 'equals', label: 'Equals', icon: Target, description: 'Field equals specific value' },
  { value: 'greater_than', label: 'Greater Than', icon: TrendingUp, description: 'Value is greater than' },
  { value: 'less_than', label: 'Less Than', icon: TrendingDown, description: 'Value is less than' },
  { value: 'contains', label: 'Contains', icon: Search, description: 'Field contains text' },
  { value: 'days_ago', label: 'Days Ago', icon: Clock, description: 'Days since date' },
  { value: 'is_true', label: 'Is True', icon: CheckCircle, description: 'Boolean field is true' },
  { value: 'is_false', label: 'Is False', icon: XCircle, description: 'Boolean field is false' },
];



interface Condition {
  id: string;
  entityType: string;
  field: string;
  condition: string;
  value: string;
  customValue?: string;
}

interface ConditionGroup {
  id: string;
  logicalOperator: 'AND' | 'OR';
  conditions: Condition[];
}

interface WarningConfigurationFormData {
  name: string;
  description: string;
  severity: string;
  isActive: boolean;
  isPublic: boolean;
  conditionGroups: ConditionGroup[];
  groupsLogicalOperator: 'AND' | 'OR';
}

export function WarningConfigurationEditDrawer({
  isOpen,
  onOpenChange,
  configuration,
  userId,
}: WarningConfigurationEditDrawerProps) {
  const { success: showSuccess, error: showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [availableFields, setAvailableFields] = useState<{[key: string]: string[]}>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'conditions'>('basic');
  const [fieldPopoverOpen, setFieldPopoverOpen] = useState<{[key: string]: boolean}>({});

  const [formData, setFormData] = useState<WarningConfigurationFormData>({
    name: '',
    description: '',
    severity: 'warning',
    isActive: true,
    isPublic: false,
    conditionGroups: [],
    groupsLogicalOperator: 'AND',
  });

  // Fetch available fields for each entity type
  useEffect(() => {
    const fetchAvailableFields = async () => {
      try {
        const response = await fetch('/api/warning-configurations/available-fields');
        if (response.ok) {
          const fields = await response.json();
          setAvailableFields(fields);
        }
      } catch (error) {
        // Error fetching available fields
      }
    };

    if (isOpen) {
      fetchAvailableFields();
    }
  }, [isOpen]);

  // Initialize form data when configuration changes
  useEffect(() => {
    if (configuration) {
      setFormData({
        name: configuration.name,
        description: configuration.description || '',
        severity: configuration.severity,
        isActive: configuration.isActive,
        isPublic: configuration.isPublic || false,
        conditionGroups: configuration.conditionGroups || [],
        groupsLogicalOperator: configuration.groupsLogicalOperator || 'AND',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        severity: 'warning',
        isActive: true,
        isPublic: false,
        conditionGroups: [],
        groupsLogicalOperator: 'AND',
      });
    }
  }, [configuration]);

  const addConditionGroup = () => {
    const newGroup: ConditionGroup = {
      id: `group-${Date.now()}`,
      logicalOperator: 'AND',
      conditions: [{
        id: `condition-${Date.now()}`,
        entityType: 'candidate',
        field: '',
        condition: 'empty',
        value: '',
        customValue: '',
      }],
    };
    setFormData(prev => ({
      ...prev,
      conditionGroups: [...prev.conditionGroups, newGroup],
    }));
    setExpandedGroups(prev => new Set([...prev, newGroup.id]));
  };

  const removeConditionGroup = (groupId: string) => {
    setFormData(prev => ({
      ...prev,
      conditionGroups: Array.isArray(prev.conditionGroups) ? prev.conditionGroups.filter(group => group.id !== groupId) : [],
    }));
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      newSet.delete(groupId);
      return newSet;
    });
  };

  const addCondition = (groupId: string) => {
    setFormData(prev => ({
      ...prev,
      conditionGroups: prev.conditionGroups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            conditions: [...group.conditions, {
              id: `condition-${Date.now()}`,
              entityType: 'candidate',
              field: '',
              condition: 'is_empty',
              value: '',
              customValue: '',
            }],
          };
        }
        return group;
      }),
    }));
  };

  const removeCondition = (groupId: string, conditionId: string) => {
    setFormData(prev => ({
      ...prev,
      conditionGroups: Array.isArray(prev.conditionGroups) ? prev.conditionGroups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            conditions: Array.isArray(group.conditions) ? group.conditions.filter(condition => condition.id !== conditionId) : [],
          };
        }
        return group;
      }) : [],
    }));
  };

  const updateCondition = (groupId: string, conditionId: string, updates: Partial<Condition>) => {
    setFormData(prev => ({
      ...prev,
      conditionGroups: prev.conditionGroups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            conditions: group.conditions.map(condition => {
              if (condition.id === conditionId) {
                return { ...condition, ...updates };
              }
              return condition;
            }),
          };
        }
        return group;
      }),
    }));
  };

  const updateConditionGroup = (groupId: string, updates: Partial<ConditionGroup>) => {
    setFormData(prev => ({
      ...prev,
      conditionGroups: prev.conditionGroups.map(group => {
        if (group.id === groupId) {
          return { ...group, ...updates };
        }
        return group;
      }),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showError('Configuration name is required');
      return;
    }

    if (formData.conditionGroups.length === 0) {
      showError('At least one condition group is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = configuration 
        ? `/api/users/${userId}/warning-configurations/${configuration.id}`
        : `/api/users/${userId}/warning-configurations`;
      
      const method = configuration ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        showSuccess(
          configuration 
            ? 'Warning configuration updated successfully'
            : 'Warning configuration created successfully'
        );
        onOpenChange(false);
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'Failed to save configuration');
      }
    } catch (error) {
      showError('Failed to save configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export conditions to JSON
  const exportConditions = () => {
    const exportData = {
      configurations: [{
        name: formData.name,
        description: formData.description,
        severity: formData.severity,
        isActive: formData.isActive,
        isPublic: formData.isPublic,
        conditionGroups: formData.conditionGroups,
        groupsLogicalOperator: formData.groupsLogicalOperator,
      }],
      exportedAt: new Date().toISOString(),
      version: '1.0',
      totalCount: 1
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warning-configs-${formData.name || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('Configuration exported successfully');
  };

  // Import conditions from JSON
  const importConditions = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importData = JSON.parse(content);
        
        // Handle both single configuration and bulk import formats
        let configToImport;
        
        if (importData.configurations && Array.isArray(importData.configurations)) {
          // Bulk import format - use the first configuration
          if (importData.configurations.length === 0) {
            throw new Error('No configurations found in import file');
          }
          configToImport = importData.configurations[0];
        } else if (importData.conditionGroups && Array.isArray(importData.conditionGroups)) {
          // Single configuration format
          configToImport = importData;
        } else {
          throw new Error('Invalid configuration format: missing conditionGroups or configurations array');
        }

                 // Update form data with imported configuration
         setFormData(prev => ({
           ...prev,
           name: configToImport.name || prev.name,
           description: configToImport.description || prev.description,
           severity: configToImport.severity || prev.severity,
           isActive: configToImport.isActive !== undefined ? configToImport.isActive : prev.isActive,
           isPublic: configToImport.isPublic !== undefined ? configToImport.isPublic : prev.isPublic,
           conditionGroups: configToImport.conditionGroups,
           groupsLogicalOperator: configToImport.groupsLogicalOperator || 'AND'
         }));

        // Expand all imported groups
        const groupIds = configToImport.conditionGroups.map((group: any) => group.id);
        setExpandedGroups(new Set(groupIds));
        
        showSuccess('Configuration imported successfully');
      } catch (error) {
        showError('Failed to import configuration. Please check the file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    event.target.value = '';
  };

  // Get value options based on condition type
  const getValueOptions = (conditionType: string, entityType: string) => {
    const baseOptions = [
      { value: 'custom', label: 'Custom Value...' },
    ];

    switch (conditionType) {
      case 'is_empty':
      case 'is_not_empty':
        return []; // No value needed for these conditions
      
      case 'is_true':
      case 'is_false':
        return []; // No value needed for boolean checks
      
      case 'equals':
        return [
          { value: 'true', label: 'True' },
          { value: 'false', label: 'False' },
          { value: 'grade_sla_days', label: 'Grade SLA Days' },
          ...baseOptions
        ];
      
      case 'greater_than':
      case 'less_than':
        return [
          { value: 'grade_sla_days', label: 'Grade SLA Days' },
          { value: '30', label: '30 days' },
          { value: '60', label: '60 days' },
          { value: '90', label: '90 days' },
          ...baseOptions
        ];
      
      case 'contains':
        return [
          { value: 'urgent', label: 'Urgent' },
          { value: 'priority', label: 'Priority' },
          ...baseOptions
        ];
      
      case 'days_ago':
        return [
          { value: 'grade_sla_days', label: 'Grade SLA Days' },
          { value: '30', label: '30 days' },
          { value: '60', label: '60 days' },
          { value: '90', label: '90 days' },
          ...baseOptions
        ];
      
      default:
        return baseOptions;
    }
  };

  // Check if condition type needs a value
  const needsValue = (conditionType: string) => {
    return !['is_empty', 'is_not_empty', 'is_true', 'is_false'].includes(conditionType);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        className="min-w-[600px] overflow-y-auto"
        style={{ width: '50vw', maxWidth: '50vw' }}
        sheetId="warning-configuration-edit-drawer"
      >
        <SheetHeader>
          <SheetTitle>
            {configuration ? 'Edit Warning Configuration' : 'New Warning Configuration'}
          </SheetTitle>
        </SheetHeader>

                 <div className="mt-6 space-y-6">
           {/* Standard Tab Design - Following system settings pattern */}
           <div className="flex w-full border-b border-border/50 mb-6">
             <div
               onClick={() => setActiveTab('basic')}
               className={cn(
                 "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                 activeTab === 'basic'
                   ? "text-primary border-b-2 border-primary"
                   : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
               )}
             >
               <Settings className="h-4 w-4" />
               Basic Information
             </div>
             <div
               onClick={() => setActiveTab('conditions')}
               className={cn(
                 "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                 activeTab === 'conditions'
                   ? "text-primary border-b-2 border-primary"
                   : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
               )}
             >
               <Target className="h-4 w-4" />
               Conditions
             </div>
           </div>

           {/* Basic Information Tab */}
           {activeTab === 'basic' && (
             <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Configuration Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter configuration name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="severity">Severity Level *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, severity: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((severity) => (
                      <SelectItem key={severity.value} value={severity.value}>
                        <div className="flex items-center gap-2">
                          <severity.icon className="h-4 w-4" />
                          {severity.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter configuration description"
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
                             <div className="flex items-center space-x-2">
                 <Switch
                   id="isPublic"
                   checked={formData.isPublic}
                   onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublic: checked }))}
                 />
                 <Label htmlFor="isPublic">Public</Label>
               </div>
             </div>
           )}

                      {/* Conditions Tab */}
           {activeTab === 'conditions' && (
             <div className="space-y-6">

              {/* Export/Import Controls */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                <div>
                  <h4 className="font-medium text-sm">Configuration Management</h4>
                  <p className="text-xs text-muted-foreground">Export or import warning configurations as JSON</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportConditions}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export JSON
                  </Button>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".json"
                      onChange={importConditions}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      id="import-conditions"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      asChild
                    >
                      <label htmlFor="import-conditions">
                        <Upload className="h-4 w-4" />
                        Import JSON
                      </label>
                    </Button>
                  </div>
                </div>
              </div>

                             {/* Condition Groups */}
               <div className="space-y-4">
                 <div className="flex items-center justify-between">
                   <div>
                     <h3 className="text-lg font-medium">Warning Conditions</h3>
                     <p className="text-sm text-muted-foreground">Define when this warning should be triggered</p>
                   </div>
                   <Button onClick={addConditionGroup} size="sm" className="flex items-center gap-2">
                     <Plus className="h-4 w-4" />
                     Add Condition Group
                   </Button>
                 </div>

                 {/* Groups Logical Operator Configuration */}
                 {formData.conditionGroups.length > 1 && (
                   <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                     <div className="flex items-center gap-2">
                       <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                         Combine Groups With:
                       </span>
                       <Select
                         value={formData.groupsLogicalOperator}
                         onValueChange={(value: 'AND' | 'OR') => 
                           setFormData(prev => ({ ...prev, groupsLogicalOperator: value }))
                         }
                       >
                         <SelectTrigger className="w-20 h-8 text-sm">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="AND">AND</SelectItem>
                           <SelectItem value="OR">OR</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                     <div className="text-xs text-blue-700 dark:text-blue-300">
                       {formData.groupsLogicalOperator === 'AND' 
                         ? 'All groups must be true for warning to trigger'
                         : 'Any group can be true for warning to trigger'
                       }
                     </div>
                   </div>
                 )}

                {formData.conditionGroups.map((group, groupIndex) => (
                  <Collapsible
                    key={group.id}
                    open={expandedGroups.has(group.id)}
                    onOpenChange={(open) => {
                      if (open) {
                        setExpandedGroups(prev => new Set([...prev, group.id]));
                      } else {
                        setExpandedGroups(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(group.id);
                          return newSet;
                        });
                      }
                    }}
                  >
                    <div className="border rounded-lg p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between cursor-pointer">
                          <div className="flex items-center gap-3">
                            {expandedGroups.has(group.id) ? (
                              <ChevronDown className="h-4 w-4 text-blue-600" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-blue-600" />
                            )}
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                  {groupIndex + 1}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  Condition Group {groupIndex + 1}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  {group.conditions.length} condition{group.conditions.length !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Combine with:</span>
                              <Select
                                value={group.logicalOperator}
                                onValueChange={(value: 'AND' | 'OR') => 
                                  updateConditionGroup(group.id, { logicalOperator: value })
                                }
                              >
                                <SelectTrigger className="w-16 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="AND">AND</SelectItem>
                                  <SelectItem value="OR">OR</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeConditionGroup(group.id);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="mt-4 space-y-4">
                        {group.conditions.map((condition, conditionIndex) => (
                          <div key={condition.id} className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-bold text-green-600 dark:text-green-400">
                                    {conditionIndex + 1}
                                  </span>
                                </div>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  Condition {conditionIndex + 1}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCondition(group.id, condition.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                                                         <div className="grid grid-cols-4 gap-3 items-end">
                               <div className="space-y-2">
                                 <Label className="text-xs font-medium text-muted-foreground">Entity</Label>
                                 <Select
                                   value={condition.entityType}
                                   onValueChange={(value) => 
                                     updateCondition(group.id, condition.id, { entityType: value })
                                   }
                                 >
                                   <SelectTrigger className="h-9 text-xs">
                                     <SelectValue placeholder="Type" />
                                   </SelectTrigger>
                                   <SelectContent>
                                     {ENTITY_TYPES.map((entity) => (
                                       <SelectItem key={entity.value} value={entity.value}>
                                         <div className="flex items-center gap-2">
                                           <entity.icon className="h-3 w-3" />
                                           {entity.label}
                                         </div>
                                       </SelectItem>
                                     ))}
                                   </SelectContent>
                                 </Select>
                               </div>

                                                               <div className="space-y-2">
                                  <Label className="text-xs font-medium text-muted-foreground">Field</Label>
                                  <Popover 
                                    open={fieldPopoverOpen[`${group.id}-${condition.id}`] || false}
                                    onOpenChange={(open) => 
                                      setFieldPopoverOpen(prev => ({
                                        ...prev,
                                        [`${group.id}-${condition.id}`]: open
                                      }))
                                    }
                                  >
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={fieldPopoverOpen[`${group.id}-${condition.id}`]}
                                        className="h-9 text-xs justify-between w-full"
                                      >
                                        {condition.field || "Select field..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0" align="start">
                                      <Command>
                                        <CommandInput placeholder="Search fields..." className="h-9" />
                                        <CommandList>
                                          <CommandEmpty>No field found.</CommandEmpty>
                                          {condition.entityType && availableFields[condition.entityType] ? (
                                            <CommandGroup>
                                              {availableFields[condition.entityType].map((field) => (
                                                <CommandItem
                                                  key={field}
                                                  value={field}
                                                  onSelect={(currentValue) => {
                                                    updateCondition(group.id, condition.id, { field: currentValue });
                                                    setFieldPopoverOpen(prev => ({
                                                      ...prev,
                                                      [`${group.id}-${condition.id}`]: false
                                                    }));
                                                  }}
                                                >
                                                  <Check
                                                    className={cn(
                                                      "mr-2 h-4 w-4",
                                                      condition.field === field ? "opacity-100" : "opacity-0"
                                                    )}
                                                  />
                                                  {field}
                                                </CommandItem>
                                              ))}
                                            </CommandGroup>
                                          ) : (
                                            <CommandGroup>
                                              <CommandItem disabled>
                                                Select entity type first
                                              </CommandItem>
                                            </CommandGroup>
                                          )}
                                        </CommandList>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                </div>

                                                               <div className="space-y-2">
                                  <Label className="text-xs font-medium text-muted-foreground">Check</Label>
                                  <Select
                                    value={condition.condition}
                                    onValueChange={(value) => 
                                      updateCondition(group.id, condition.id, { condition: value })
                                    }
                                  >
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {CONDITION_TYPES.map((conditionType) => (
                                        <SelectItem key={conditionType.value} value={conditionType.value}>
                                          <div className="flex items-center gap-2">
                                            <conditionType.icon className="h-3 w-3" />
                                            {conditionType.label}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                                               <div className="space-y-2">
                                  <Label className="text-xs font-medium text-muted-foreground">Value</Label>
                                  {needsValue(condition.condition) ? (
                                    <div className="flex gap-2">
                                      <Select
                                        value={condition.value || ''}
                                        onValueChange={(value) => 
                                          updateCondition(group.id, condition.id, { 
                                            value: value === 'custom' ? 'custom' : value 
                                          })
                                        }
                                      >
                                        <SelectTrigger className="h-9 text-xs flex-1">
                                          <SelectValue placeholder="Select value" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {getValueOptions(condition.condition, condition.entityType).map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                              {option.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      {condition.value === 'custom' && (
                                        <Input
                                          value={condition.customValue || ''}
                                          onChange={(e) => 
                                            updateCondition(group.id, condition.id, { 
                                              value: 'custom',
                                              customValue: e.target.value 
                                            })
                                          }
                                          placeholder="Enter custom value"
                                          className="h-9 text-xs flex-1"
                                        />
                                      )}
                                    </div>
                                  ) : (
                                    <div className="h-9 flex items-center text-xs text-muted-foreground px-3 bg-muted/50 rounded-md">
                                      No value needed for this condition
                                    </div>
                                  )}
                                </div>
                             </div>
                          </div>
                        ))}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addCondition(group.id)}
                          className="w-full border-dashed border-2 hover:border-solid transition-colors"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Another Condition
                        </Button>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}

                {formData.conditionGroups.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Target className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      No Warning Conditions Defined
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                      Create your first condition group to define when this warning should be triggered. 
                      You can add multiple conditions and groups to create complex warning rules.
                    </p>
                    <Button onClick={addConditionGroup} variant="default" size="lg" className="flex items-center gap-2 mx-auto">
                      <Plus className="h-5 w-5" />
                      Create First Condition Group
                    </Button>
                                     </div>
                 )}
               </div>
             </div>
           )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (configuration ? 'Update' : 'Create')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
