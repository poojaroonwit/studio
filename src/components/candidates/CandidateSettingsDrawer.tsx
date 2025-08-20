"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface CandidateSettingsDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsChange: (settings: CandidateSettings) => void;
  currentSettings: CandidateSettings;
}

export interface CandidateSettings {
  // Table columns to show
  showCandidateColumn: boolean;
  showAppliedJobColumn: boolean;
  showJobMatchesColumn: boolean;
  showFitScoreColumn: boolean;
  showRecruiterColumn: boolean;
  showStatusColumn: boolean;
  showAppliedDateColumn: boolean;
  
  // Filter options
  showFilters: boolean;
  showHorizontalFitScoreFilters: boolean;
  
  // Fit score type preference
  fitScoreType: 'applied' | 'matching';
}

const defaultSettings: CandidateSettings = {
  showCandidateColumn: true,
  showAppliedJobColumn: true,
  showJobMatchesColumn: true,
  showFitScoreColumn: true,
  showRecruiterColumn: true,
  showStatusColumn: true,
  showAppliedDateColumn: true,
  showFilters: true,
  showHorizontalFitScoreFilters: true,
  fitScoreType: 'applied'
};

export function CandidateSettingsDrawer({
  isOpen,
  onOpenChange,
  onSettingsChange,
  currentSettings
}: CandidateSettingsDrawerProps) {
  const [localSettings, setLocalSettings] = useState<CandidateSettings>(currentSettings);

  useEffect(() => {
    setLocalSettings(currentSettings);
  }, [currentSettings]);

  const handleSettingChange = (key: keyof CandidateSettings, value: boolean | string) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
    onOpenChange(false);
  };

  const handleReset = () => {
    setLocalSettings(defaultSettings);
  };

  const handleCancel = () => {
    setLocalSettings(currentSettings);
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
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
                  Choose which columns to display in the candidate table
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showCandidateColumn" className="text-sm font-medium">
                      Candidate Name
                    </Label>
                    <Switch
                      id="showCandidateColumn"
                      checked={localSettings.showCandidateColumn}
                      onCheckedChange={(checked) => handleSettingChange('showCandidateColumn', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showAppliedJobColumn" className="text-sm font-medium">
                      Applied Job
                    </Label>
                    <Switch
                      id="showAppliedJobColumn"
                      checked={localSettings.showAppliedJobColumn}
                      onCheckedChange={(checked) => handleSettingChange('showAppliedJobColumn', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showJobMatchesColumn" className="text-sm font-medium">
                      Job Matches Count
                    </Label>
                    <Switch
                      id="showJobMatchesColumn"
                      checked={localSettings.showJobMatchesColumn}
                      onCheckedChange={(checked) => handleSettingChange('showJobMatchesColumn', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showFitScoreColumn" className="text-sm font-medium">
                      Fit Score
                    </Label>
                    <Switch
                      id="showFitScoreColumn"
                      checked={localSettings.showFitScoreColumn}
                      onCheckedChange={(checked) => handleSettingChange('showFitScoreColumn', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showRecruiterColumn" className="text-sm font-medium">
                      Recruiter
                    </Label>
                    <Switch
                      id="showRecruiterColumn"
                      checked={localSettings.showRecruiterColumn}
                      onCheckedChange={(checked) => handleSettingChange('showRecruiterColumn', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showStatusColumn" className="text-sm font-medium">
                      Status
                    </Label>
                    <Switch
                      id="showStatusColumn"
                      checked={localSettings.showStatusColumn}
                      onCheckedChange={(checked) => handleSettingChange('showStatusColumn', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showAppliedDateColumn" className="text-sm font-medium">
                      Applied Date
                    </Label>
                    <Switch
                      id="showAppliedDateColumn"
                      checked={localSettings.showAppliedDateColumn}
                      onCheckedChange={(checked) => handleSettingChange('showAppliedDateColumn', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Filter Options Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filter Options</CardTitle>
                <CardDescription>
                  Configure filter display options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="showFilters" className="text-sm font-medium">
                    Show Left Sidebar Filters
                  </Label>
                  <Switch
                    id="showFilters"
                    checked={localSettings.showFilters}
                    onCheckedChange={(checked) => handleSettingChange('showFilters', checked)}
                  />
                </div>
                
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
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="matching" id="matching" />
                    <Label htmlFor="matching" className="text-sm font-medium">
                      Job Match Fit Score
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          <SheetFooter className="border-t pt-4">
            <div className="flex items-center justify-between w-full">
              <Button variant="outline" onClick={handleReset}>
                Reset to Default
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  Save Settings
                </Button>
              </div>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
  );
}
