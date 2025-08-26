import React, { useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Edit3, 
  Trash2, 
  Eye, 
  Filter, 
  User, 
  Building, 
  FileText, 
  Calendar,
  Settings,
  Shield,
  CheckCircle,
  XCircle,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CustomFieldDefinition } from '@/lib/types';

interface CustomFieldTableProps {
  fields: CustomFieldDefinition[];
  isLoading: boolean;
  onEdit: (field: CustomFieldDefinition) => void;
  onDelete: (field: CustomFieldDefinition) => void;
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

const FIELD_TYPE_LABELS = {
  text: 'Text',
  textarea: 'Text Area',
  number: 'Number',
  boolean: 'Boolean',
  date: 'Date',
  select_single: 'Single Select',
  select_multiple: 'Multi Select',
};

export default function CustomFieldTable({ 
  fields, 
  isLoading, 
  onEdit, 
  onDelete 
}: CustomFieldTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading custom fields...</span>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>No custom fields defined yet.</p>
        <p className="text-sm">Create your first custom field to get started.</p>
      </div>
    );
  }

  const getFieldTypeIcon = (type: string) => {
    const Icon = FIELD_TYPE_ICONS[type as keyof typeof FIELD_TYPE_ICONS] || FileText;
    return <Icon className="h-4 w-4" />;
  };

  const getModelIcon = (model: string) => {
    const Icon = MODEL_ICONS[model as keyof typeof MODEL_ICONS] || User;
    return <Icon className="h-4 w-4" />;
  };

  const getVisibilityBadges = (field: CustomFieldDefinition) => {
    const badges = [];
    
    if (field.showInFilter) {
      badges.push(
        <Badge key="filter" variant="secondary" className="text-xs">
          <Filter className="h-3 w-3 mr-1" />
          Filter
        </Badge>
      );
    }
    
    if (field.showInCandidateDetail) {
      badges.push(
        <Badge key="detail" variant="secondary" className="text-xs">
          <Eye className="h-3 w-3 mr-1" />
          Detail
        </Badge>
      );
    }
    
    if (field.showInFullCandidateDetail) {
      badges.push(
        <Badge key="full-detail" variant="secondary" className="text-xs">
          <Eye className="h-3 w-3 mr-1" />
          Full Detail
        </Badge>
      );
    }
    
    if (field.showInTaskBoardFilter) {
      badges.push(
        <Badge key="taskboard" variant="secondary" className="text-xs">
          <Settings className="h-3 w-3 mr-1" />
          Task Board
        </Badge>
      );
    }
    
    if (field.showInPositionSettings) {
      badges.push(
        <Badge key="position-settings" variant="secondary" className="text-xs">
          <Settings className="h-3 w-3 mr-1" />
          Position Settings
        </Badge>
      );
    }
    
    return badges;
  };

  const getPermissionBadges = (field: CustomFieldDefinition) => {
    const badges = [];
    
    if (field.viewRoles && field.viewRoles.length > 0) {
      badges.push(
        <Badge key="view" variant="outline" className="text-xs">
          <Eye className="h-3 w-3 mr-1" />
          View: {field.viewRoles.join(', ')}
        </Badge>
      );
    }
    
    if (field.editRoles && field.editRoles.length > 0) {
      badges.push(
        <Badge key="edit" variant="outline" className="text-xs">
          <Edit3 className="h-3 w-3 mr-1" />
          Edit: {field.editRoles.join(', ')}
        </Badge>
      );
    }
    
    return badges;
  };

  const handleEdit = useCallback((field: CustomFieldDefinition) => {
    onEdit(field);
  }, [onEdit]);

  const handleDelete = useCallback((field: CustomFieldDefinition) => {
    onDelete(field);
  }, [onDelete]);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fields.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Candidate Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fields.filter(f => f.model_name === 'Candidate').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Position Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fields.filter(f => f.model_name === 'Position').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">User Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fields.filter(f => f.model_name === 'User').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Field</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Properties</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field) => (
              <TableRow key={field.id}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{field.label}</div>
                    <div className="text-sm text-muted-foreground font-mono">
                      {field.field_key}
                    </div>
                    {field.field_code && (
                      <div className="text-xs text-muted-foreground">
                        Code: {field.field_code}
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getFieldTypeIcon(field.field_type)}
                    <span className="text-sm">
                      {FIELD_TYPE_LABELS[field.field_type as keyof typeof FIELD_TYPE_LABELS]}
                    </span>
                  </div>
                  {field.options && field.options.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {field.options.length} option{field.options.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getModelIcon(field.model_name)}
                    <span className="text-sm">{field.model_name}</span>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {getVisibilityBadges(field)}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {getPermissionBadges(field)}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    {field.is_required && (
                      <Badge variant="destructive" className="text-xs">
                        Required
                      </Badge>
                    )}
                    {field.allowCustomOptions && (
                      <Badge variant="outline" className="text-xs">
                        Custom Options
                      </Badge>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Order: {field.sort_order}
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(field)}>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(field)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 