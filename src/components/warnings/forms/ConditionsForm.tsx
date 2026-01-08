"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Trash2, 
  Target, 
  Eye, 
  Hash, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Clock, 
  XCircle 
} from 'lucide-react';

interface Condition {
  id: string;
  entityType: string;
  field: string;
  condition: string;
  value: string;
}

interface ConditionsFormProps {
  entityType: string;
  conditions: Condition[];
  onConditionsChange: (conditions: Condition[]) => void;
}

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

export function ConditionsForm({ entityType, conditions, onConditionsChange }: ConditionsFormProps) {
  const [newCondition, setNewCondition] = useState<Partial<Condition>>({
    entityType: entityType,
    condition: 'is_empty',
    value: ''
  });

  const addCondition = () => {
    if (!newCondition.entityType || !newCondition.field || !newCondition.condition) {
      return;
    }

    const condition: Condition = {
      id: Date.now().toString(),
      entityType: newCondition.entityType,
      field: newCondition.field,
      condition: newCondition.condition,
      value: newCondition.value || ''
    };

    onConditionsChange([...conditions, condition]);
    setNewCondition({
      entityType: entityType,
      condition: 'is_empty',
      value: ''
    });
  };

  const removeCondition = (id: string) => {
    onConditionsChange(conditions.filter(c => c.id !== id));
  };

  const updateCondition = (id: string, field: keyof Condition, value: any) => {
    onConditionsChange(conditions.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  return (
    <div className="space-y-4">
      {/* Add New Condition */}
      <div className="p-4 border rounded-lg bg-muted/30">
        <h4 className="font-medium mb-3">Add New Condition</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label htmlFor="newEntityType">Entity Type</Label>
            <Select
              value={newCondition.entityType}
              onValueChange={(value) => setNewCondition(prev => ({ ...prev, entityType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="newField">Field</Label>
            <Input
              id="newField"
              value={newCondition.field || ''}
              onChange={(e) => setNewCondition(prev => ({ ...prev, field: e.target.value }))}
              placeholder="e.g., status, createdAt"
            />
          </div>

          <div>
            <Label htmlFor="newCondition">Condition</Label>
            <Select
              value={newCondition.condition}
              onValueChange={(value) => setNewCondition(prev => ({ ...prev, condition: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_TYPES.map((condition) => {
                  const Icon = condition.icon;
                  return (
                    <SelectItem key={condition.value} value={condition.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {condition.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="newValue">Value</Label>
            <Input
              id="newValue"
              value={newCondition.value || ''}
              onChange={(e) => setNewCondition(prev => ({ ...prev, value: e.target.value }))}
              placeholder="Value to compare"
            />
          </div>
        </div>

        <Button 
          onClick={addCondition} 
          className="mt-3"
          disabled={!newCondition.entityType || !newCondition.field || !newCondition.condition}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Condition
        </Button>
      </div>

      {/* Existing Conditions */}
      {conditions.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Current Conditions</h4>
          {conditions.map((condition) => (
            <div key={condition.id} className="p-3 border rounded-lg bg-background">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Entity Type</Label>
                  <Select
                    value={condition.entityType}
                    onValueChange={(value) => updateCondition(condition.id, 'entityType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
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

                <div>
                  <Label className="text-xs text-muted-foreground">Field</Label>
                  <Input
                    value={condition.field}
                    onChange={(e) => updateCondition(condition.id, 'field', e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Condition</Label>
                  <Select
                    value={condition.condition}
                    onValueChange={(value) => updateCondition(condition.id, 'condition', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITION_TYPES.map((cond) => (
                        <SelectItem key={cond.value} value={cond.value}>
                          {cond.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Value</Label>
                    <Input
                      value={condition.value}
                      onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeCondition(condition.id)}
                    className="h-10 w-10 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
