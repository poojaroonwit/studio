"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  createdBy?: string;
  createdByUser?: {
    id: string;
    name: string;
    email: string;
  };
  sharedWith?: Array<{
    id: string;
    userId: string;
    canEdit: boolean;
    canDelete: boolean;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

interface WarningConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  configuration: WarningConfiguration | null;
}

const ENTITY_TYPES = [
  { value: 'position', label: 'Position' },
  { value: 'candidate', label: 'Candidate' },
  { value: 'headcount', label: 'Headcount' },
];

const CONDITIONS = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'empty', label: 'Empty' },
  { value: 'threshold', label: 'Threshold' },
  { value: 'date_range', label: 'Date Range' },
  { value: 'custom', label: 'Custom' },
];

const OPERATORS = {
  overdue: [],
  empty: [],
  threshold: [
    { value: 'gt', label: 'Greater than' },
    { value: 'gte', label: 'Greater than or equal' },
    { value: 'lt', label: 'Less than' },
    { value: 'lte', label: 'Less than or equal' },
    { value: 'eq', label: 'Equal' },
    { value: 'ne', label: 'Not equal' },
  ],
  date_range: [
    { value: 'gt', label: 'After' },
    { value: 'gte', label: 'After or on' },
    { value: 'lt', label: 'Before' },
    { value: 'lte', label: 'Before or on' },
    { value: 'eq', label: 'On' },
    { value: 'ne', label: 'Not on' },
  ],
  custom: [
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does not contain' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' },
    { value: 'eq', label: 'Equals' },
    { value: 'ne', label: 'Does not equal' },
  ],
};

const SEVERITIES = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
  { value: 'critical', label: 'Critical' },
];

const FIELD_SUGGESTIONS = {
  position: [
    'title',
    'department',
    'description',
    'isOpen',
    'positionLevel',
    'hiringDate',
    'createdAt',
    'updatedAt',
  ],
  candidate: [
    'name',
    'email',
    'phone',
    'status',
    'fitScore',
    'applicationDate',
    'createdAt',
    'updatedAt',
  ],
  headcount: [
    'type',
    'status',
    'onboardingDate',
    'createdAt',
    'updatedAt',
  ],
};

export function WarningConfigurationModal({
  isOpen,
  onClose,
  onSave,
  configuration,
}: WarningConfigurationModalProps) {
  const { error: showError, success: showSuccess } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<WarningConfiguration>>({
    name: '',
    description: '',
    entityType: 'position',
    field: '',
    condition: 'overdue',
    operator: 'gt', // Default operator for overdue
    value: '',
    threshold: undefined,
    severity: 'warning',
    isActive: true,
    isPublic: false,
  });
  const [useGradeSLA, setUseGradeSLA] = useState(false);

  useEffect(() => {
    if (configuration) {
      setFormData({
        id: configuration.id,
        name: configuration.name,
        description: configuration.description,
        entityType: configuration.entityType,
        field: configuration.field,
        condition: configuration.condition,
        operator: configuration.condition === 'overdue' && !configuration.operator ? 'gt' : configuration.operator,
        value: configuration.value,
        threshold: configuration.threshold,
        severity: configuration.severity,
        isActive: configuration.isActive,
        isPublic: configuration.isPublic || false,
      });
      // Check if this configuration uses grade SLA (threshold is null/undefined for overdue)
      setUseGradeSLA(configuration.condition === 'overdue' && !configuration.threshold);
    } else {
      setFormData({
        name: '',
        description: '',
        entityType: 'position',
        field: '',
        condition: 'overdue',
        operator: 'gt', // Default operator for overdue
        value: '',
        threshold: undefined,
        severity: 'warning',
        isActive: true,
        isPublic: false,
      });
      setUseGradeSLA(false);
    }
  }, [configuration, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.entityType || !formData.field || !formData.condition) {
      showError("Please fill in all required fields");
      return;
    }

    if (formData.condition !== 'empty' && formData.condition !== 'overdue' && !formData.operator) {
      showError("Please select an operator");
      return;
    }

    // For overdue condition, either use grade SLA or require threshold
    if (formData.condition === 'overdue' && !useGradeSLA && !formData.threshold) {
      showError("Please set a threshold for overdue condition or use grade SLA");
      return;
    }

    if ((formData.condition === 'threshold' || formData.condition === 'date_range' || formData.condition === 'custom') && !formData.value) {
      showError("Please set a value for this condition");
      return;
    }

    setIsLoading(true);

    try {
      const url = configuration 
        ? `/api/settings/warning-configurations/${configuration.id}`
        : '/api/settings/warning-configurations';
      
      const method = configuration ? 'PUT' : 'POST';

      // If using grade SLA for overdue, set threshold to null
      const submitData = {
        ...formData,
        operator: formData.condition === 'overdue' ? 'gt' : formData.operator, // Set default operator for overdue
        threshold: formData.condition === 'overdue' && useGradeSLA ? null : formData.threshold
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
        onSave();
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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Reset operator when condition changes
    if (field === 'condition') {
      setFormData(prev => ({
        ...prev,
        [field]: value,
        operator: value === 'overdue' ? 'gt' : '', // Set default operator for overdue
      }));
    }

    // Reset field when entity type changes
    if (field === 'entityType') {
      setFormData(prev => ({
        ...prev,
        [field]: value,
        field: '',
      }));
    }

    // Reset useGradeSLA when condition changes
    if (field === 'condition') {
      setUseGradeSLA(false);
    }
  };

  const getAvailableOperators = () => {
    return OPERATORS[formData.condition as keyof typeof OPERATORS] || [];
  };

  const getFieldSuggestions = () => {
    return FIELD_SUGGESTIONS[formData.entityType as keyof typeof FIELD_SUGGESTIONS] || [];
  };

  const shouldShowOperator = formData.condition && formData.condition !== 'empty' && formData.condition !== 'overdue';
  const shouldShowValue = formData.condition && formData.condition !== 'empty' && formData.condition !== 'overdue';
  const shouldShowThreshold = formData.condition === 'overdue';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {configuration ? 'Edit Warning Configuration' : 'Create Warning Configuration'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter configuration name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity">Severity</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) => handleInputChange('severity', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((severity) => (
                      <SelectItem key={severity.value} value={severity.value}>
                        {severity.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter description (optional)"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleInputChange('isActive', checked)}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isPublic"
                checked={formData.isPublic}
                onCheckedChange={(checked) => handleInputChange('isPublic', checked)}
              />
              <Label htmlFor="isPublic">Public (Share with all users)</Label>
            </div>
          </div>

          {/* Entity Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Entity Configuration</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entityType">Entity Type *</Label>
                <Select
                  value={formData.entityType}
                  onValueChange={(value) => handleInputChange('entityType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="field">Field *</Label>
                <Select
                  value={formData.field}
                  onValueChange={(value) => handleInputChange('field', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {getFieldSuggestions().map((field) => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Condition Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Condition Configuration</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="condition">Condition Type *</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(value) => handleInputChange('condition', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((condition) => (
                      <SelectItem key={condition.value} value={condition.value}>
                        {condition.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {shouldShowOperator && (
                <div className="space-y-2">
                  <Label htmlFor="operator">Operator *</Label>
                  <Select
                    value={formData.operator}
                    onValueChange={(value) => handleInputChange('operator', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select operator" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableOperators().map((operator) => (
                        <SelectItem key={operator.value} value={operator.value}>
                          {operator.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {shouldShowThreshold && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="useGradeSLA"
                    checked={useGradeSLA}
                    onCheckedChange={(checked) => {
                      setUseGradeSLA(checked);
                      if (checked) {
                        setFormData(prev => ({ ...prev, threshold: undefined }));
                      }
                    }}
                  />
                  <Label htmlFor="useGradeSLA">Use position grade SLA (dynamic threshold)</Label>
                </div>
                
                {!useGradeSLA && (
                  <div className="space-y-2">
                    <Label htmlFor="threshold">Threshold (days) *</Label>
                    <Input
                      id="threshold"
                      type="number"
                      value={formData.threshold || ''}
                      onChange={(e) => handleInputChange('threshold', parseInt(e.target.value) || undefined)}
                      placeholder="Enter threshold in days"
                      min="1"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter a fixed number of days for the overdue threshold
                    </p>
                  </div>
                )}
                
                {useGradeSLA && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Dynamic Threshold:</strong> The warning will use the SLA days from each position's grade:
                    </p>
                    <ul className="text-xs text-blue-600 dark:text-blue-400 mt-2 space-y-1">
                      <li>• Junior: 30 days SLA</li>
                      <li>• Mid-Level: 45 days SLA</li>
                      <li>• Senior: 60 days SLA</li>
                      <li>• Lead: 90 days SLA</li>
                    </ul>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                      The threshold will automatically adjust based on the position's assigned grade.
                    </p>
                  </div>
                )}
              </div>
            )}

            {shouldShowValue && (
              <div className="space-y-2">
                <Label htmlFor="value">Value *</Label>
                <Input
                  id="value"
                  value={formData.value}
                  onChange={(e) => handleInputChange('value', e.target.value)}
                  placeholder={
                    formData.condition === 'date_range' 
                      ? 'Enter date (YYYY-MM-DD)' 
                      : formData.condition === 'threshold'
                      ? 'Enter numeric value'
                      : 'Enter value'
                  }
                  type={formData.condition === 'date_range' ? 'date' : 'text'}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : (configuration ? 'Update' : 'Create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
