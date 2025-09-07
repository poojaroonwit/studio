import React from 'react';
import type { CustomFieldDefinition } from '@/lib/types';

/**
 * Filters custom fields based on section selection and visibility settings
 */
export function filterCustomFieldsBySection(
  customFields: CustomFieldDefinition[],
  section: string,
  modelName: 'Candidate' | 'Position' | 'User' | 'Headcount'
): CustomFieldDefinition[] {
  return customFields.filter(field => {
    // Must match the model
    if (field.model_name !== modelName) return false;

    // Check visibility settings based on model and section
    switch (modelName) {
      case 'Candidate':
        // For candidate detail sections - show all custom fields regardless of visibility settings
        if (section === 'jobs' || section === 'candidate-info' || section === 'education' || section === 'experience' || section === 'job-suitability') {
          // Show all custom fields for candidates in edit mode
          // If section is specified, check if it matches (but don't require it)
          if (field.candidateDetailSection && field.candidateDetailSection !== section) {
            // If field has a specific section and it doesn't match, skip it
            return false;
          }
          
          return true;
        }
        // For regular candidate detail (not full detail)
        return field.showInCandidateDetail && !field.showInFullCandidateDetail;
        
      case 'Position':
        // For position detail sections
        if (section === 'details' || section === 'criteria' || section === 'candidates' || section === 'headcount') {
          // Check if field should be shown in position settings
          if (!field.showInPositionSettings) return false;
          
          // If section is specified, check if it matches
          if (field.positionDetailSection && field.positionDetailSection !== section) return false;
          
          return true;
        }
        return false;
        
      case 'Headcount':
        return field.showInHeadcountDetail;
        
      default:
        return false;
    }
  });
}

/**
 * Fetches custom field definitions for a specific model and section
 */
export async function fetchCustomFieldsForSection(
  modelName: 'Candidate' | 'Position' | 'User' | 'Headcount',
  section?: string
): Promise<CustomFieldDefinition[]> {
  try {
    const response = await fetch('/api/settings/custom-field-definitions');
    if (!response.ok) {
      throw new Error('Failed to fetch custom field definitions');
    }
    
    const allFields: CustomFieldDefinition[] = await response.json();
    
    if (section) {
      return filterCustomFieldsBySection(allFields, section, modelName);
    }
    
    // Return all fields for the model if no section specified
    return allFields.filter(field => field.model_name === modelName);
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    return [];
  }
}

/**
 * Fetches custom field definitions that are enabled for filtering
 */
export async function fetchFilterableCustomFields(
  modelName: 'Candidate' | 'Position' | 'User' | 'Headcount'
): Promise<CustomFieldDefinition[]> {
  try {
    const response = await fetch('/api/settings/custom-field-definitions');
    if (!response.ok) {
      throw new Error('Failed to fetch custom field definitions');
    }
    
    const allFields: CustomFieldDefinition[] = await response.json();
    
    // Filter for fields that are enabled for filtering
    return allFields.filter(field => 
      field.model_name === modelName && field.showInFilter
    );
  } catch (error) {
    console.error('Error fetching filterable custom fields:', error);
    return [];
  }
}

/**
 * Fetches custom field definitions for task board filtering
 */
export async function fetchTaskBoardFilterableCustomFields(
  modelName: 'Candidate' | 'Position' | 'User' | 'Headcount'
): Promise<CustomFieldDefinition[]> {
  try {
    const response = await fetch('/api/settings/custom-field-definitions');
    if (!response.ok) {
      throw new Error('Failed to fetch custom field definitions');
    }
    
    const allFields: CustomFieldDefinition[] = await response.json();
    
    // Filter for fields that are enabled for task board filtering
    return allFields.filter(field => 
      field.model_name === modelName && field.showInTaskBoardFilter
    );
  } catch (error) {
    console.error('Error fetching task board filterable custom fields:', error);
    return [];
  }
}

/**
 * Renders a custom field value based on its type
 */
export function renderCustomFieldValue(definition: CustomFieldDefinition, value: any): React.ReactNode {
  if (!value) return <span className="text-muted-foreground text-sm">-</span>;

  switch (definition.field_type) {
    case 'boolean':
      return (
        <span className={`text-sm font-medium ${value ? 'text-green-600' : 'text-gray-500'}`}>
          {value ? 'Yes' : 'No'}
        </span>
      );

    case 'date':
      try {
        const date = new Date(value);
        return (
          <span className="text-sm text-muted-foreground">
            {date.toLocaleDateString()}
          </span>
        );
      } catch {
        return <span className="text-sm text-muted-foreground">{value}</span>;
      }

    case 'select_single':
      const option = definition.options?.find(opt => opt.value === value);
      return (
        <span className="text-sm font-medium">
          {option?.label || value}
        </span>
      );

    case 'select_multiple':
      if (Array.isArray(value)) {
        const labels = value.map(v => {
          const option = definition.options?.find(opt => opt.value === v);
          return option?.label || v;
        });
        return (
          <div className="text-sm">
            {labels.join(', ')}
          </div>
        );
      }
      return <span className="text-sm text-muted-foreground">-</span>;

    case 'number':
      return (
        <span className="text-sm font-medium">
          {value}
        </span>
      );

    case 'textarea':
      return (
        <div className="text-sm text-muted-foreground max-w-xs">
          <div className="line-clamp-3" title={value}>
            {value}
          </div>
        </div>
      );

    default:
      return (
        <span className="text-sm text-muted-foreground max-w-xs truncate" title={value}>
          {value}
        </span>
      );
  }
}
