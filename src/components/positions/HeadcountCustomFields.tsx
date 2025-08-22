"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { CustomFieldDefinition, CustomFieldType } from '@/lib/types';

interface HeadcountCustomFieldsProps {
  customFields: Record<string, any>;
  onCustomFieldsChange: (customFields: Record<string, any>) => void;
  positionId: string;
}

export function HeadcountCustomFields({ 
  customFields, 
  onCustomFieldsChange, 
  positionId 
}: HeadcountCustomFieldsProps) {
  const [fieldDefinitions, setFieldDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomFieldDefinitions();
  }, []);

  const fetchCustomFieldDefinitions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/custom-field-definitions?model=Headcount');
      if (response.ok) {
        const definitions = await response.json();
        setFieldDefinitions(definitions.filter((def: CustomFieldDefinition) => def.showInHeadcountDetail));
      }
    } catch (error) {
      console.error('Error fetching custom field definitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldCode: string, value: any) => {
    const updatedFields = {
      ...customFields,
      [fieldCode]: value,
    };
    onCustomFieldsChange(updatedFields);
  };

  const renderField = (definition: CustomFieldDefinition) => {
    const value = customFields[definition.field_code] || '';

    switch (definition.field_type) {
      case 'text':
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(definition.field_code, e.target.value)}
            placeholder={`Enter ${definition.label.toLowerCase()}`}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(definition.field_code, e.target.value)}
            placeholder={`Enter ${definition.label.toLowerCase()}`}
            rows={3}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(definition.field_code, parseFloat(e.target.value) || 0)}
            placeholder={`Enter ${definition.label.toLowerCase()}`}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={definition.field_code}
              checked={value}
              onCheckedChange={(checked) => handleFieldChange(definition.field_code, checked)}
            />
            <Label htmlFor={definition.field_code}>{definition.label}</Label>
          </div>
        );

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !value && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => handleFieldChange(definition.field_code, date?.toISOString())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case 'select_single':
        return (
          <Select
            value={value}
            onValueChange={(newValue) => handleFieldChange(definition.field_code, newValue)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${definition.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {definition.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'select_multiple':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {selectedValues.map((selectedValue) => {
                const option = definition.options?.find(opt => opt.value === selectedValue);
                return (
                  <Badge
                    key={selectedValue}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => {
                      const newValues = selectedValues.filter(v => v !== selectedValue);
                      handleFieldChange(definition.field_code, newValues);
                    }}
                  >
                    {option?.label || selectedValue} ×
                  </Badge>
                );
              })}
            </div>
            <Select
              onValueChange={(newValue) => {
                if (!selectedValues.includes(newValue)) {
                  handleFieldChange(definition.field_code, [...selectedValues, newValue]);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Add ${definition.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {definition.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(definition.field_code, e.target.value)}
            placeholder={`Enter ${definition.label.toLowerCase()}`}
          />
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (fieldDefinitions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Fields</CardTitle>
        <CardDescription>
          Additional information specific to this headcount
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fieldDefinitions.map((definition) => (
          <div key={definition.id} className="space-y-2">
            <Label htmlFor={definition.field_code}>
              {definition.label}
              {definition.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {renderField(definition)}
            {definition.label && (
              <p className="text-sm text-muted-foreground">{definition.label}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
