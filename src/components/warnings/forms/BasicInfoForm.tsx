"use client";

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Info, 
  AlertTriangle, 
  AlertCircle, 
  AlertOctagon 
} from 'lucide-react';

interface WarningConfiguration {
  id: string;
  name: string;
  description?: string;
  severity: string;
  isActive: boolean;
  isPublic?: boolean;
}

interface BasicInfoFormProps {
  formData: WarningConfiguration;
  setFormData: (data: WarningConfiguration) => void;
}

const SEVERITIES = [
  { value: 'info', label: 'Info', icon: Info },
  { value: 'warning', label: 'Warning', icon: AlertTriangle },
  { value: 'error', label: 'Error', icon: AlertCircle },
  { value: 'critical', label: 'Critical', icon: AlertOctagon },
];

export function BasicInfoForm({ formData, setFormData }: BasicInfoFormProps) {
  const handleChange = (field: keyof WarningConfiguration, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Configuration Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Enter configuration name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Enter description (optional)"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="severity">Severity Level *</Label>
        <Select
          value={formData.severity}
          onValueChange={(value) => handleChange('severity', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select severity" />
          </SelectTrigger>
          <SelectContent>
            {SEVERITIES.map((severity) => {
              const Icon = severity.icon;
              return (
                <SelectItem key={severity.value} value={severity.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {severity.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label htmlFor="isActive">Active</Label>
          <p className="text-sm text-muted-foreground">
            Enable this warning configuration
          </p>
        </div>
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => handleChange('isActive', checked)}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label htmlFor="isPublic">Public</Label>
          <p className="text-sm text-muted-foreground">
            Make this configuration available to all users
          </p>
        </div>
        <Switch
          id="isPublic"
          checked={formData.isPublic || false}
          onCheckedChange={(checked) => handleChange('isPublic', checked)}
        />
      </div>
    </div>
  );
}
