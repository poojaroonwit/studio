"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import type { CustomFieldDefinition } from '@/lib/types';
import { fetchCustomFieldsForSection, renderCustomFieldValue } from '@/lib/customFieldUtils';

interface PositionCustomFieldDisplayProps {
  section: string;
  positionId: string;
  customFields?: Record<string, any>; // The actual field values
  title?: string;
  className?: string;
}

export function PositionCustomFieldDisplay({ 
  section, 
  positionId, 
  customFields = {}, 
  title = "Custom Fields",
  className = ""
}: PositionCustomFieldDisplayProps) {
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
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {fieldDefinitions.map((definition) => {
            const value = customFields[definition.field_code];
            
            return (
              <div key={definition.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground">
                    {definition.label}
                    {definition.is_required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </label>
                  <Badge variant="outline" className="text-xs">
                    {definition.field_type.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="text-sm">
                  {renderCustomFieldValue(definition, value)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
