"use client";

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertTriangle, 
  Save, 
  X, 
  Settings, 
  Eye, 
  Clock, 
  Target,
  Hash,
  Calendar,
  Info,
  AlertCircle,
  AlertOctagon,
  Plus,
  Trash2,
  And,
  Or,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Download,
  Upload,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Condition {
  id: string;
  entityType: string;
  field: string;
  operator: string;
  value: string;
  condition: string;
}

interface ConditionGroup {
  id: string;
  operator: 'AND' | 'OR';
  conditions: Condition[];
}

interface WarningConfiguration {
  id: string;
  name: string;
  description?: string;
  entityType: string;
  field: string;
  condition: string;
  operator: string;
  value?: string;
  threshold?: number;
  severity: string;
  isActive: boolean;
  isPublic?: boolean;
  conditionGroups?: ConditionGroup[];
  createdBy?: string;
  createdByUser?: {
    id: string;
    name: string;
    email: string;
  };
}

interface WarningConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  configuration: WarningConfiguration | null;
  userId: string;
}

const ENTITY_TYPES = [
  { value: 'position', label: 'Position', icon: Target },
  { value: 'candidate', label: 'Candidate', icon: Eye },
  { value: 'headcount', label: 'Headcount', icon: Hash },
];

const OPERATORS = [
  { value: 'eq', label: 'Equals' },
  { value: 'ne', label: 'Not Equals' },
  { value: 'gt', label: 'Greater Than' },
  { value: 'gte', label: 'Greater Than or Equal' },
  { value: 'lt', label: 'Less Than' },
  { value: 'lte', label: 'Less Than or Equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Not Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
  { value: 'is_null', label: 'Is Null' },
  { value: 'is_not_null', label: 'Is Not Null' },
];

const CONDITIONS = [
  { value: 'overdue', label: 'Overdue', icon: Clock },
  { value: 'empty', label: 'Empty', icon: AlertTriangle },
  { value: 'threshold', label: 'Threshold', icon: Target },
  { value: 'date_range', label: 'Date Range', icon: Calendar },
  { value: 'custom', label: 'Custom', icon: Settings },
];

const SEVERITIES = [
  { value: 'info', label: 'Info', icon: Info },
  { value: 'warning', label: 'Warning', icon: AlertTriangle },
  { value: 'error', label: 'Error', icon: AlertCircle },
  { value: 'critical', label: 'Critical', icon: AlertOctagon },
];

const FIELD_SUGGESTIONS = {
  position: [
    { value: 'title', label: 'Title', description: 'Position title' },
    { value: 'hiringDate', label: 'Hiring Date', description: 'Target hiring date' },
    { value: 'grade', label: 'Grade', description: 'Position grade' },
    { value: 'headcount', label: 'Headcount', description: 'Number of positions' },
    { value: 'vacancies', label: 'Vacancies', description: 'Number of open positions' },
    { value: 'recruiterId', label: 'Recruiters', description: 'Assigned recruiter' },
    { value: 'status', label: 'Status', description: 'Position status' },
    { value: 'department', label: 'Department', description: 'Department' },
    { value: 'location', label: 'Location', description: 'Work location' },
    { value: 'salary', label: 'Salary', description: 'Salary range' },
  ],
  candidate: [
    { value: 'name', label: 'Name', description: 'Candidate name' },
    { value: 'email', label: 'Email', description: 'Email address' },
    { value: 'phone', label: 'Phone', description: 'Phone number' },
    { value: 'applicationDate', label: 'Application Date', description: 'Date of application' },
    { value: 'source', label: 'Source', description: 'Recruitment source' },
    { value: 'recruiterId', label: 'Recruiters', description: 'Assigned recruiter' },
    { value: 'status', label: 'Status', description: 'Application status' },
    { value: 'experience', label: 'Experience', description: 'Years of experience' },
    { value: 'education', label: 'Education', description: 'Education level' },
    { value: 'skills', label: 'Skills', description: 'Skills list' },
  ],
  headcount: [
    { value: 'type', label: 'Type', description: 'Headcount type' },
    { value: 'status', label: 'Status', description: 'Current status' },
    { value: 'onboardingDate', label: 'Onboarding Date', description: 'Onboarding date' },
    { value: 'notes', label: 'Notes', description: 'Headcount notes' },
    { value: 'position.title', label: 'Position Title', description: 'Associated position title' },
    { value: 'candidate.name', label: 'Candidate Name', description: 'Assigned candidate name' },
  ],
};

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export function WarningConfigurationModal({
  isOpen,
  onClose,
  configuration,
  userId,
}: WarningConfigurationModalProps) {
  const { success: showSuccess, error: showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('basic');

  const [formData, setFormData] = useState<Partial<WarningConfiguration>>({
    name: '',
    description: '',
    entityType: 'position',
    field: '',
    condition: 'empty',
    operator: 'eq',
    value: '',
            threshold: undefined,
    severity: 'warning',
    isActive: true,
    isPublic: false,
    conditionGroups: [],
  });

  useEffect(() => {
    if (configuration) {
      setFormData({
        ...configuration,
        threshold: configuration.threshold || undefined,
        conditionGroups: configuration.conditionGroups || [],
      });
      // Expand all groups by default when editing
      if (configuration.conditionGroups) {
        setExpandedGroups(new Set(configuration.conditionGroups.map(g => g.id)));
      }
    } else {
      setFormData({
        name: '',
        description: '',
        entityType: 'position',
        field: '',
        condition: 'empty',
        operator: 'eq',
        value: '',
        threshold: undefined,
        severity: 'warning',
        isActive: true,
        isPublic: false,
        conditionGroups: [],
      });
      setExpandedGroups(new Set());
    }
  }, [configuration, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.severity) {
      showError('Please fill in all required fields');
      return;
    }

    // Validate that we have at least one condition group with conditions
    if (!formData.conditionGroups || formData.conditionGroups.length === 0) {
      showError('Please add at least one condition group');
      return;
    }

    const hasValidConditions = formData.conditionGroups.some(group => 
      group.conditions && group.conditions.length > 0
    );

    if (!hasValidConditions) {
      showError('Please add at least one condition to a group');
      return;
    }

    setIsLoading(true);

    try {
      const baseUrl = `/api/users/${userId}/warning-configurations`;
      
      const url = configuration 
        ? `${baseUrl}/${configuration.id}`
        : baseUrl;
      
      const method = configuration ? 'PUT' : 'POST';

      const submitData = {
        ...formData,
        // Keep legacy fields for backward compatibility
        entityType: formData.conditionGroups?.[0]?.conditions?.[0]?.entityType || 'position',
        field: formData.conditionGroups?.[0]?.conditions?.[0]?.field || '',
        condition: formData.conditionGroups?.[0]?.conditions?.[0]?.condition || 'custom',
        operator: formData.conditionGroups?.[0]?.conditions?.[0]?.operator || 'eq',
        value: formData.conditionGroups?.[0]?.conditions?.[0]?.value || '',
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        showSuccess(configuration 
          ? "Warning configuration updated successfully"
          : "Warning configuration created successfully");
        onClose();
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.details || errorData.error || errorData.message || 'Failed to save configuration';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error saving warning configuration:', error);
      showError((error as Error).message || "Failed to save warning configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const addConditionGroup = () => {
    const newGroup: ConditionGroup = {
      id: generateId(),
      operator: 'AND',
      conditions: [{
        id: generateId(),
        entityType: formData.entityType || 'position',
        field: '',
        operator: 'eq',
        value: '',
        condition: 'custom',
      }],
    };

    setFormData(prev => ({
      ...prev,
      conditionGroups: [...(prev.conditionGroups || []), newGroup],
    }));
    setExpandedGroups(prev => new Set([...prev, newGroup.id]));
  };

  const removeConditionGroup = (groupId: string) => {
    setFormData(prev => ({
      ...prev,
      conditionGroups: prev.conditionGroups?.filter(g => g.id !== groupId) || [],
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
      conditionGroups: prev.conditionGroups?.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            conditions: [...group.conditions, {
              id: generateId(),
              entityType: formData.entityType || 'position',
              field: '',
              operator: 'eq',
              value: '',
              condition: 'custom',
            }],
          };
        }
        return group;
      }) || [],
    }));
  };

  const removeCondition = (groupId: string, conditionId: string) => {
      setFormData(prev => ({
        ...prev,
      conditionGroups: prev.conditionGroups?.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            conditions: group.conditions.filter(c => c.id !== conditionId),
          };
        }
        return group;
      }) || [],
    }));
  };

  const updateConditionGroup = (groupId: string, updates: Partial<ConditionGroup>) => {
    setFormData(prev => ({
      ...prev,
      conditionGroups: prev.conditionGroups?.map(group => {
        if (group.id === groupId) {
          return { ...group, ...updates };
        }
        return group;
      }) || [],
    }));
  };

  const updateCondition = (groupId: string, conditionId: string, updates: Partial<Condition>) => {
      setFormData(prev => ({
        ...prev,
      conditionGroups: prev.conditionGroups?.map(group => {
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
      }) || [],
    }));
  };

  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const getFieldSuggestions = (entityType: string) => {
    return FIELD_SUGGESTIONS[entityType as keyof typeof FIELD_SUGGESTIONS] || [];
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
          conditionGroups: configToImport.conditionGroups
        }));

        // Expand all imported groups
        const groupIds = configToImport.conditionGroups.map((group: any) => group.id);
        setExpandedGroups(new Set(groupIds));
        
        showSuccess('Configuration imported successfully');
      } catch (error) {
        console.error('Error importing configuration:', error);
        showError('Failed to import configuration. Please check the file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    event.target.value = '';
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[40vw] max-w-[40vw] min-w-[600px] overflow-y-auto">
        <SheetHeader className="pb-6">
          <SheetTitle className="flex items-center gap-2 text-2xl font-semibold">
            <AlertTriangle className="h-6 w-6 text-primary" />
            {configuration ? 'Edit Warning Configuration' : 'Create Warning Configuration'}
          </SheetTitle>
          <p className="text-muted-foreground mt-2">
            {configuration ? 'Modify the warning configuration settings' : 'Create a new warning configuration with complex conditions'}
          </p>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Basic Information
              </TabsTrigger>
              <TabsTrigger value="conditions" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Conditions
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label htmlFor="isPublic">Public (Share with other users)</Label>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description (optional)"
                  rows={3}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="conditions" className="space-y-4 mt-6">
              {/* Export/Import Controls */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                  <div>
                  <h4 className="font-medium text-sm">Configuration Management</h4>
                  <p className="text-xs text-muted-foreground">Export or import warning configurations as JSON</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={exportConditions}
                    disabled={!formData.conditionGroups || formData.conditionGroups.length === 0}
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
                      id="import-config"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      asChild
                    >
                      <label htmlFor="import-config">
                        <Upload className="h-4 w-4" />
                        Import JSON
                      </label>
                    </Button>
                  </div>
                </div>
              </div>

              {formData.conditionGroups && formData.conditionGroups.length > 0 ? (
                <div className="space-y-4">
                  {formData.conditionGroups.map((group, groupIndex) => (
                    <Card key={group.id} className="border-2 bg-muted/30">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-sm">Condition Group {groupIndex + 1}</span>
                            <Select
                              value={group.operator}
                              onValueChange={(value: 'AND' | 'OR') => 
                                updateConditionGroup(group.id, { operator: value })
                              }
                            >
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AND">
                                  <div className="flex items-center gap-1">
                                    <And className="h-3 w-3" />
                                    AND
                                  </div>
                                </SelectItem>
                                <SelectItem value="OR">
                                  <div className="flex items-center gap-1">
                                    <Or className="h-3 w-3" />
                                    OR
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleGroupExpansion(group.id)}
                            >
                              {expandedGroups.has(group.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeConditionGroup(group.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <Collapsible open={expandedGroups.has(group.id)}>
                        <CollapsibleContent>
                          <CardContent className="pt-0 space-y-4">
                                                         {group.conditions.map((condition, conditionIndex) => (
                               <div key={condition.id} className="border rounded-lg p-4 space-y-4 bg-background">
                                 <div className="flex items-center justify-between">
                                   <span className="text-sm font-semibold">Condition {conditionIndex + 1}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeCondition(group.id, condition.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
          </div>

                                                                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                  <div className="space-y-2">
                                    <Label>Entity Type</Label>
              <Select
                                      value={condition.entityType}
                                      onValueChange={(value) => 
                                        updateCondition(group.id, condition.id, { 
                                          entityType: value,
                                          field: '' // Reset field when entity type changes
                                        })
                                      }
              >
                <SelectTrigger>
                                        <SelectValue />
                </SelectTrigger>
                <SelectContent>
                                        {ENTITY_TYPES.map((entity) => (
                                          <SelectItem key={entity.value} value={entity.value}>
                        <div className="flex items-center gap-2">
                                              <entity.icon className="h-4 w-4" />
                                              {entity.label}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Field</Label>
                                    <Select
                                      value={condition.field}
                                      onValueChange={(value) => 
                                        updateCondition(group.id, condition.id, { field: value })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select field" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {getFieldSuggestions(condition.entityType).map((field) => (
                                          <SelectItem key={field.value} value={field.value}>
                                            <div>
                                              <div className="font-medium">{field.label}</div>
                                              <div className="text-xs text-muted-foreground">
                                                {field.description}
                                              </div>
                        </div>
                      </SelectItem>
                                        ))}
                </SelectContent>
              </Select>
            </div>

                                  <div className="space-y-2">
                                    <Label>Operator</Label>
                                    <Select
                                      value={condition.operator}
                                      onValueChange={(value) => 
                                        updateCondition(group.id, condition.id, { operator: value })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {OPERATORS.map((op) => (
                                          <SelectItem key={op.value} value={op.value}>
                                            {op.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
              </div>

                                  <div className="space-y-2">
                                    <Label>Value</Label>
                                    <Input
                                      value={condition.value}
                                      onChange={(e) => 
                                        updateCondition(group.id, condition.id, { value: e.target.value })
                                      }
                                      placeholder="Enter value"
              />
            </div>
          </div>
                              </div>
                            ))}
                            
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addCondition(group.id)}
                              className="w-full"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Condition
                            </Button>
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No condition groups defined</p>
                  <p className="text-sm">Add a condition group to start building your warning rules</p>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={addConditionGroup}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Condition Group
              </Button>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="px-6">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="px-6">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {configuration ? 'Update' : 'Create'} Configuration
                </>
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
