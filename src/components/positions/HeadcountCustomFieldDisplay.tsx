"use client";

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { CustomFieldDefinition } from '@/lib/types';

interface HeadcountCustomFieldDisplayProps {
  customFields: Record<string, any>;
  positionId: string;
}

export function HeadcountCustomFieldDisplay({ 
  customFields, 
  positionId 
}: HeadcountCustomFieldDisplayProps) {
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

  const renderFieldValue = (definition: CustomFieldDefinition, value: any) => {
    if (!value) return null;

    switch (definition.field_type) {
      case 'boolean':
        return (
          <Badge variant={value ? "default" : "secondary"}>
            {value ? 'Yes' : 'No'}
          </Badge>
        );

      case 'date':
        return (
          <span className="text-sm text-muted-foreground">
            {format(new Date(value), 'MMM dd, yyyy')}
          </span>
        );

      case 'select_single':
        const option = definition.options?.find(opt => opt.value === value);
        return (
          <Badge variant="outline" className="text-xs">
            {option?.label || value}
          </Badge>
        );

      case 'select_multiple':
        if (Array.isArray(value)) {
          return (
            <div className="flex flex-wrap gap-1">
              {value.map((v, index) => {
                const option = definition.options?.find(opt => opt.value === v);
                return (
                  <Badge key={index} variant="outline" className="text-xs">
                    {option?.label || v}
                  </Badge>
                );
              })}
            </div>
          );
        }
        return null;

      case 'number':
        return (
          <span className="text-sm font-medium">
            {value}
          </span>
        );

      case 'textarea':
        return (
          <span className="text-sm text-muted-foreground truncate max-w-xs">
            {value}
          </span>
        );

      default:
        return (
          <span className="text-sm text-muted-foreground truncate max-w-xs">
            {value}
          </span>
        );
    }
  };

  if (loading || fieldDefinitions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {fieldDefinitions.map((definition) => {
        const value = customFields[definition.field_code];
        if (!value) return null;

        return (
          <div key={definition.id} className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {definition.label}:
            </span>
            {renderFieldValue(definition, value)}
          </div>
        );
      })}
    </div>
  );
}
