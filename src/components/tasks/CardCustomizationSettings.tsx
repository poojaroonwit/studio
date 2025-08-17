"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings, 
  Eye, 
  EyeOff, 
  User, 
  Mail, 
  FileText, 
  Target, 
  Users, 
  AlertTriangle, 
  Calendar,
  Tag,
  HardDrive,
  Briefcase,
  Monitor,
  Save,
  RotateCcw
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'react-hot-toast';
import type { TaskBoardPreferences } from '@/hooks/use-user-preferences';

interface CardCustomizationSettingsProps {
  preferences: TaskBoardPreferences;
  onUpdatePreferences: (updates: Partial<TaskBoardPreferences>) => void;
  onResetPreferences: () => void;
  isSaving?: boolean;
}

const fieldConfigs = [
  {
    key: 'showAvatar',
    label: 'Avatar',
    icon: User,
    defaultEnabled: true
  },
  {
    key: 'showName',
    label: 'Name',
    icon: User,
    defaultEnabled: true
  },
  {
    key: 'showEmail',
    label: 'Email',
    icon: Mail,
    defaultEnabled: true
  },
  {
    key: 'showDescription',
    label: 'Description',
    icon: FileText,
    defaultEnabled: true
  },
  {
    key: 'showFitScore',
    label: 'Fit Score',
    icon: Target,
    defaultEnabled: true
  },
  {
    key: 'showAssignee',
    label: 'Assignee',
    icon: Users,
    defaultEnabled: false
  },
  {
    key: 'showPriority',
    label: 'Priority',
    icon: AlertTriangle,
    defaultEnabled: false
  },
  {
    key: 'showDueDate',
    label: 'Due Date',
    icon: Calendar,
    defaultEnabled: false
  },
  {
    key: 'showTags',
    label: 'Tags',
    icon: Tag,
    defaultEnabled: false
  },
  {
    key: 'showSkills',
    label: 'Skills',
    icon: HardDrive,
    defaultEnabled: false
  },
  {
    key: 'showJobApplied',
    label: 'Job Applied',
    icon: Briefcase,
    defaultEnabled: false
  }
];

const widthOptions = [
  { value: 'narrow', label: 'Narrow (200px)', width: 200 },
  { value: 'medium', label: 'Medium (256px)', width: 256 },
  { value: 'wide', label: 'Wide (320px)', width: 320 },
  { value: 'custom', label: 'Custom', width: null }
];

export function CardCustomizationSettings({
  preferences,
  onUpdatePreferences,
  onResetPreferences,
  isSaving = false
}: CardCustomizationSettingsProps) {
  const [localPreferences, setLocalPreferences] = useState<TaskBoardPreferences>(preferences);
  const [hasChanges, setHasChanges] = useState(false);

  // Update local preferences when props change
  React.useEffect(() => {
    setLocalPreferences(preferences);
    setHasChanges(false);
  }, [preferences]);

  const handleFieldToggle = (fieldKey: string, enabled: boolean) => {
    const updates = { [fieldKey]: enabled };
    setLocalPreferences(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleCardWidthChange = (value: string) => {
    const widthOption = widthOptions.find(option => option.value === value);
    const updates: Partial<TaskBoardPreferences> = {
      cardWidth: value as 'narrow' | 'medium' | 'wide' | 'custom'
    };
    
    if (widthOption?.width) {
      updates.customCardWidth = widthOption.width;
    }
    
    setLocalPreferences(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleCustomWidthChange = (value: number[]) => {
    const width = value[0];
    setLocalPreferences(prev => ({ 
      ...prev, 
      customCardWidth: width,
      cardWidth: 'custom'
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdatePreferences(localPreferences);
    setHasChanges(false);
    toast.success('Card settings saved successfully');
  };

  const handleReset = () => {
    onResetPreferences();
    setHasChanges(false);
  };

  const getCurrentWidth = () => {
    if (localPreferences.cardWidth === 'custom') {
      return localPreferences.customCardWidth || 256;
    }
    const option = widthOptions.find(opt => opt.value === localPreferences.cardWidth);
    return option?.width || 256;
  };

  const enabledFields = fieldConfigs.filter(field => 
    localPreferences[field.key as keyof TaskBoardPreferences] === true
  );

  return (
    <div className="space-y-4">
      <Tabs defaultValue="width" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="width" className="flex items-center gap-2">
            <Monitor className="h-3 w-3" />
            Card Width
          </TabsTrigger>
          <TabsTrigger value="fields" className="flex items-center gap-2">
            <Eye className="h-3 w-3" />
            Visible Fields
          </TabsTrigger>
        </TabsList>

        <TabsContent value="width" className="space-y-4 mt-4">
          <div>
            <Label className="text-xs font-medium">Width Preset</Label>
            <Select value={localPreferences.cardWidth} onValueChange={handleCardWidthChange}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {widthOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {localPreferences.cardWidth === 'custom' && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium">Custom Width: {getCurrentWidth()}px</Label>
                <Slider
                  value={[getCurrentWidth()]}
                  onValueChange={handleCustomWidthChange}
                  min={180}
                  max={400}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>180px</span>
                  <span>400px</span>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="fields" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 gap-2">
            {fieldConfigs.map(field => {
              const Icon = field.icon;
              const isEnabled = localPreferences[field.key as keyof TaskBoardPreferences] === true;
              
              return (
                <div
                  key={field.key}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-all duration-200 ${
                    isEnabled 
                      ? 'bg-primary/5 border-primary/20 shadow-sm' 
                      : 'bg-background border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-3 w-3 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="text-sm font-medium">{field.label}</div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleFieldToggle(field.key, checked)}
                    className="scale-75"
                  />
                </div>
              );
            })}
          </div>

          <Separator />

          <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
            <div>
              <div className="text-sm font-medium">Enabled Fields</div>
              <div className="text-xs text-muted-foreground">
                {enabledFields.length} of {fieldConfigs.length} fields visible
              </div>
            </div>
            <div className="flex gap-1">
              {enabledFields.slice(0, 3).map(field => (
                <Badge key={field.key} variant="secondary" className="text-xs">
                  {field.label}
                </Badge>
              ))}
              {enabledFields.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{enabledFields.length - 3}
                </Badge>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end items-center pt-4 border-t">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          size="sm"
          className="flex items-center gap-2"
        >
          <Save className="h-3 w-3" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
