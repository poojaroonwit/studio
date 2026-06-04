"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  HardDrive,
  Briefcase,
  Monitor,
  Save,
  RotateCcw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
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
  const [activeTab, setActiveTab] = useState('width');

  // Add custom scrollbar styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
        border-radius: 4px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: hsl(var(--muted-foreground) / 0.3);
        border-radius: 4px;
        transition: background 0.2s ease;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: hsl(var(--muted-foreground) / 0.5);
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb:active {
        background: hsl(var(--muted-foreground) / 0.7);
      }
      
      .custom-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Update local preferences when props change, but only if there are no local changes
  React.useEffect(() => {
    if (!hasChanges) {
      setLocalPreferences(preferences);
    }
  }, [preferences, hasChanges]);

  const handleFieldToggle = useCallback((fieldKey: string, enabled: boolean) => {
    const updates = { [fieldKey]: enabled };
    setLocalPreferences(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  const handleCardWidthChange = useCallback((value: string) => {
    const widthOption = widthOptions.find(option => option.value === value);
    const updates: Partial<TaskBoardPreferences> = {
      cardWidth: value as 'narrow' | 'medium' | 'wide' | 'custom'
    };
    
    if (widthOption?.width) {
      updates.customCardWidth = widthOption.width;
    }
    
    setLocalPreferences(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  const handleCustomWidthChange = useCallback((value: number[]) => {
    const width = value[0];
    setLocalPreferences(prev => ({ 
      ...prev, 
      customCardWidth: width,
      cardWidth: 'custom'
    }));
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    // Only pass the differences between local and original preferences
    const changes: Record<string, any> = {};
    const keys = Object.keys(localPreferences) as (keyof TaskBoardPreferences)[];
    
    keys.forEach(key => {
      if (localPreferences[key] !== preferences[key]) {
        changes[key] = localPreferences[key];
      }
    });
    
    if (Object.keys(changes).length > 0) {
      onUpdatePreferences(changes);
    }
    setHasChanges(false);
    toast.success('Card settings saved successfully');
  }, [localPreferences, preferences, onUpdatePreferences]);

  const handleReset = useCallback(() => {
    onResetPreferences();
    setHasChanges(false);
  }, [onResetPreferences]);

  const getCurrentWidth = useCallback(() => {
    if (localPreferences.cardWidth === 'custom') {
      return localPreferences.customCardWidth || 256;
    }
    const option = widthOptions.find(opt => opt.value === localPreferences.cardWidth);
    return option?.width || 256;
  }, [localPreferences.cardWidth, localPreferences.customCardWidth]);

  const enabledFields = useMemo(() => 
    fieldConfigs.filter(field => 
      localPreferences[field.key as keyof TaskBoardPreferences] === true
    ), [localPreferences]
  );

  return (
    <div className="flex flex-col h-full max-h-[650px]">
      {/* Standard Tab Design - Fixed at top */}
      <div className="flex w-full border-b border-border/50 mb-6 flex-shrink-0">
        <div
          onClick={() => setActiveTab('width')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
            activeTab === 'width'
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
         role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}>
          <Monitor className="h-4 w-4" />
          Card Width
        </div>
        <div
          onClick={() => setActiveTab('fields')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
            activeTab === 'fields'
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
         role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}>
          <Eye className="h-4 w-4" />
          Visible Fields
        </div>
      </div>

      {/* Scrollable Content Area with Custom Scrollbar */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-4 custom-scrollbar">
        <div className="space-y-4 pb-4">
          {/* Tab Content */}
          {activeTab === 'width' && (
            <div className="space-y-4">
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
            </div>
          )}

          {activeTab === 'fields' && (
            <div className="space-y-4">
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
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons - Fixed at bottom */}
      <div className="flex justify-end items-center pt-4 border-t mt-4 flex-shrink-0">
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
