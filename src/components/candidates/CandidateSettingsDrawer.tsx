"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, X, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useJobMatchFeature } from '@/hooks/useJobMatchFeature';

interface CandidateSettingsDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsChange: (settings: CandidateSettings) => Promise<void>;
  currentSettings?: CandidateSettings;
  isLoading?: boolean;
  error?: string | null;
  onClearError?: () => void;
}

export interface CandidateSettings {
  // Table columns to show
  showCandidateColumn: boolean;
  showAppliedJobColumn: boolean;
  showJobMatchesColumn: boolean;
  showFitScoreColumn: boolean;
  showRecruiterColumn: boolean;
  showSourceColumn: boolean;
  showStatusColumn: boolean;
  showAppliedDateColumn: boolean;
  showLastUpdateColumn: boolean;
  
  // Column order
  columnOrder: string[];
  
  // Filter options
  showFilters: boolean;
  showHorizontalFitScoreFilters: boolean;
  
  // Fit score type preference
  fitScoreType: 'applied' | 'matching';
  
  // Fit score filter mode
  fitScoreFilterMode: 'single' | 'multi';
  
  // Table size settings
  rowHeight: 'compact' | 'normal' | 'comfortable';
}

const defaultSettings: CandidateSettings = {
  showCandidateColumn: true,
  showAppliedJobColumn: true,
  showJobMatchesColumn: true,
  showFitScoreColumn: true,
  showRecruiterColumn: true,
  showSourceColumn: true,
  showStatusColumn: true,
  showAppliedDateColumn: true,
  showLastUpdateColumn: false,
  columnOrder: [
    'candidate',
    'appliedJob',
    'jobMatches',
    'fitScore',
    'recruiter',
    'source',
    'status',
    'appliedDate',
    'lastUpdate'
  ],
  showFilters: true,
  showHorizontalFitScoreFilters: true,
  fitScoreType: 'applied',
  fitScoreFilterMode: 'single',
  rowHeight: 'normal'
} as const;

// Column configuration for drag and drop
const columnConfig = [
  { key: 'candidate', label: 'Candidate Name', settingKey: 'showCandidateColumn' as keyof CandidateSettings },
  { key: 'appliedJob', label: 'Applied Job', settingKey: 'showAppliedJobColumn' as keyof CandidateSettings },
  { key: 'jobMatches', label: 'Job Matches Count', settingKey: 'showJobMatchesColumn' as keyof CandidateSettings },
  { key: 'fitScore', label: 'Fit Score', settingKey: 'showFitScoreColumn' as keyof CandidateSettings },
  { key: 'recruiter', label: 'Recruiter', settingKey: 'showRecruiterColumn' as keyof CandidateSettings },
  { key: 'source', label: 'Source', settingKey: 'showSourceColumn' as keyof CandidateSettings },
  { key: 'status', label: 'Status', settingKey: 'showStatusColumn' as keyof CandidateSettings },
  { key: 'appliedDate', label: 'Applied Date', settingKey: 'showAppliedDateColumn' as keyof CandidateSettings },
  { key: 'lastUpdate', label: 'Last Update', settingKey: 'showLastUpdateColumn' as keyof CandidateSettings },
];

export function CandidateSettingsDrawer({
  isOpen,
  onOpenChange,
  onSettingsChange,
  currentSettings,
  isLoading = false,
  error = null,
  onClearError
}: CandidateSettingsDrawerProps) {
  const { isJobMatchEnabled } = useJobMatchFeature();
  
  // Initialize local settings with currentSettings or defaults
  const [localSettings, setLocalSettings] = useState<CandidateSettings>(() => {
    if (currentSettings) {
      return {
        ...defaultSettings,
        ...currentSettings
      };
    }
    return defaultSettings;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Update local settings when currentSettings changes
  useEffect(() => {
    if (currentSettings) {
      setLocalSettings(prev => ({
        ...defaultSettings,
        ...prev,
        ...currentSettings
      }));
    }
  }, [currentSettings]);

  const handleSettingChange = (key: keyof CandidateSettings, value: boolean | string | number) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(localSettings.columnOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setLocalSettings(prev => ({ ...prev, columnOrder: items }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);
      await onSettingsChange(localSettings);
      onOpenChange(false);
    } catch (error) {
      console.error('🔧 SETTINGS DRAWER: Error saving settings:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLocalSettings(defaultSettings);
  };

  const handleCancel = () => {
    setLocalSettings(currentSettings || defaultSettings);
    setSaveError(null);
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto" sheetId="candidate-settings-drawer">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <SheetTitle>Candidate Page Settings</SheetTitle>
            </div>
          </div>
          <SheetDescription>
            Configure which columns to display in the candidate table and filter options.
          </SheetDescription>
        </SheetHeader>

          <div className="py-6 space-y-6">
            {/* Table Columns Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Table Columns</CardTitle>
                <CardDescription>
                  Choose which columns to display and drag to reorder them
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="columns">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2"
                      >
                        {localSettings.columnOrder.map((columnKey, index) => {
                          const column = columnConfig.find(c => c.key === columnKey);
                          if (!column) return null;
                          
                          // Skip job matches column if feature is disabled
                          if (column.key === 'jobMatches' && !isJobMatchEnabled) {
                            return null;
                          }
                          
                          return (
                            <Draggable key={column.key} draggableId={column.key} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                    snapshot.isDragging 
                                      ? 'bg-primary/10 border-primary shadow-md' 
                                      : 'bg-background border-border hover:bg-muted/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      {...provided.dragHandleProps}
                                      className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                                    >
                                      <GripVertical className="h-4 w-4" />
                                    </div>
                                    <Label htmlFor={column.settingKey} className="text-sm font-medium cursor-pointer">
                                      {column.label}
                                    </Label>
                                  </div>
                                  <Switch
                                    id={column.settingKey}
                                    checked={localSettings[column.settingKey] as boolean}
                                    onCheckedChange={(checked) => handleSettingChange(column.settingKey, checked)}
                                  />
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </CardContent>
            </Card>

            <Separator />

            {/* Horizontal Fit Score Filters Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Horizontal Fit Score Filters</CardTitle>
                <CardDescription>
                  Show horizontal fit score filter tabs above the candidate table
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label htmlFor="showHorizontalFitScoreFilters" className="text-sm font-medium">
                    Show Horizontal Fit Score Filters
                  </Label>
                  <Switch
                    id="showHorizontalFitScoreFilters"
                    checked={localSettings.showHorizontalFitScoreFilters}
                    onCheckedChange={(checked) => handleSettingChange('showHorizontalFitScoreFilters', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Fit Score Type Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fit Score Preference</CardTitle>
                <CardDescription>
                  Choose which fit score type to prioritize
                </CardDescription>
              </CardHeader>
              <CardContent>
                                 <RadioGroup
                   value={localSettings.fitScoreType}
                   onValueChange={(value: 'applied' | 'matching') => handleSettingChange('fitScoreType', value)}
                   className="space-y-3"
                 >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="applied" id="applied" />
                    <Label htmlFor="applied" className="text-sm font-medium">
                      Applied Job Fit Score
                    </Label>
                  </div>
                  {isJobMatchEnabled && (
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="matching" id="matching" />
                      <Label htmlFor="matching" className="text-sm font-medium">
                        Job Match Fit Score
                      </Label>
                    </div>
                  )}
                </RadioGroup>
              </CardContent>
            </Card>

            <Separator />

            {/* Fit Score Filter Mode Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fit Score Filter Mode</CardTitle>
                <CardDescription>
                  Configure how fit score filters behave when selecting grades
                </CardDescription>
              </CardHeader>
              <CardContent>
                                 <RadioGroup
                   value={localSettings.fitScoreFilterMode}
                   onValueChange={(value: 'single' | 'multi') => handleSettingChange('fitScoreFilterMode', value)}
                   className="space-y-3"
                 >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="single" id="single" />
                    <Label htmlFor="single" className="text-sm font-medium">
                      Single Select
                    </Label>
                    <div className="text-xs text-muted-foreground ml-2">
                      Only one fit score grade can be selected at a time
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="multi" id="multi" />
                    <Label htmlFor="multi" className="text-sm font-medium">
                      Multi Select
                    </Label>
                    <div className="text-xs text-muted-foreground ml-2">
                      Multiple fit score grades can be selected simultaneously
                    </div>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            <Separator />

            {/* Row Height Settings Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Row Height</CardTitle>
                <CardDescription>
                  Adjust the height of table rows for better readability
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="rowHeight" className="text-sm font-medium">
                    Row Height
                  </Label>
                  <Select
                    value={localSettings.rowHeight || 'normal'}
                    onValueChange={(value: 'compact' | 'normal' | 'comfortable') => handleSettingChange('rowHeight', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="comfortable">Comfortable</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground">
                    Choose the spacing between table rows
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <SheetFooter className="border-t pt-4">
            <div className="flex flex-col w-full space-y-3">
              {/* Error message */}
              {(error || saveError) && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2 flex items-center justify-between">
                  <span>{error || saveError}</span>
                  {onClearError && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSaveError(null);
                        onClearError();
                      }}
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
              
              {/* Loading indicator */}
              {(isLoading || isSaving) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
                  {isSaving ? 'Saving settings...' : 'Loading settings...'}
                </div>
              )}
              
              {/* Action buttons */}
              <div className="flex items-center justify-end w-full">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={isSaving || isLoading}
                  >
                    {isSaving ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </div>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
  );
}
