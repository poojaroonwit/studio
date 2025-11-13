"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { CustomFieldDefinition } from '@/lib/types';
import { fetchCustomFieldsForSection } from '@/lib/customFieldUtils';

interface PositionCustomFieldEditProps {
  section: string;
  positionId: string;
  customFields: { [fieldCode: string]: any }; // The actual field values
  onFieldChange: (fieldCode: string, value: any) => void;
  title?: string;
  className?: string;
}

export function PositionCustomFieldEdit({ 
  section, 
  positionId, 
  customFields = {}, 
  onFieldChange,
  title = "Custom Fields",
  className = ""
}: PositionCustomFieldEditProps) {
  const [fieldDefinitions, setFieldDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFieldDefinitions = async () => {
      try {
        setLoading(true);
        setError(null);
        const fields = await fetchCustomFieldsForSection('Position', section);
        setFieldDefinitions(fields);
      } catch (err) {
        console.error('Failed to load custom field definitions:', err);
        setError('Failed to load custom fields');
      } finally {
        setLoading(false);
      }
    };

    loadFieldDefinitions();
  }, [section]);

  const renderFieldInput = (definition: CustomFieldDefinition) => {
    const fieldValue = customFields[definition.field_code];
    const fieldId = `custom_${definition.field_code}`;

    switch (definition.field_type) {
      case 'text':
        return (
          <Input
            id={fieldId}
            value={fieldValue || ''}
            onChange={(e) => onFieldChange(definition.field_code, e.target.value)}
            placeholder={`Enter ${definition.label.toLowerCase()}...`}
            className="w-full"
          />
        );

      case 'textarea':
        return (
          <textarea
            id={fieldId}
            value={fieldValue || ''}
            onChange={(e) => onFieldChange(definition.field_code, e.target.value)}
            placeholder={`Enter ${definition.label.toLowerCase()}...`}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-gray-100 dark:bg-gray-600 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            rows={3}
          />
        );

      case 'number':
        return (
          <Input
            id={fieldId}
            type="number"
            value={fieldValue || ''}
            onChange={(e) => onFieldChange(definition.field_code, e.target.value ? Number(e.target.value) : null)}
            placeholder={`Enter ${definition.label.toLowerCase()}...`}
            className="w-full"
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={fieldId}
              checked={fieldValue === true}
              onCheckedChange={(checked) => onFieldChange(definition.field_code, checked)}
            />
            <Label htmlFor={fieldId} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {definition.label}
            </Label>
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
                  !fieldValue && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fieldValue ? format(new Date(fieldValue), "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={fieldValue ? new Date(fieldValue) : undefined}
                onSelect={(date) => onFieldChange(definition.field_code, date ? date.toISOString() : null)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case 'select_single':
        return (
          <Select value={fieldValue || ''} onValueChange={(value) => onFieldChange(definition.field_code, value)}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${definition.label.toLowerCase()}...`} />
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
        return (
          <div className="space-y-2">
            {definition.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${fieldId}_${option.value}`}
                  checked={Array.isArray(fieldValue) && fieldValue.includes(option.value)}
                  onCheckedChange={(checked) => {
                    const currentValues = Array.isArray(fieldValue) ? fieldValue : [];
                    if (checked) {
                      onFieldChange(definition.field_code, [...currentValues, option.value]);
                    } else {
                      onFieldChange(definition.field_code, currentValues.filter(v => v !== option.value));
                    }
                  }}
                />
                <Label htmlFor={`${fieldId}_${option.value}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <Input
            id={fieldId}
            value={fieldValue || ''}
            onChange={(e) => onFieldChange(definition.field_code, e.target.value)}
            placeholder={`Enter ${definition.label.toLowerCase()}...`}
            className="w-full"
          />
        );
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading custom fields...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (fieldDefinitions.length === 0) {
    return null; // Don't render anything if no custom fields
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fieldDefinitions.map((definition) => (
          <div key={definition.field_code} className="space-y-2">
            <Label htmlFor={`custom_${definition.field_code}`} className="text-sm font-medium">
              {definition.label}
              {definition.is_required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            {renderFieldInput(definition)}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
