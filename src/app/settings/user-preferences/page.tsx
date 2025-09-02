"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  RotateCcw, 
  Settings, 
  Filter, 
  Eye, 
  EyeOff, 
  Loader2, 
  Database, 
  AlertCircle,
  Palette,
  Layout,
  User,
  Bell,
  Monitor,
  Smartphone,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { PersonalColorPicker } from '@/components/settings/PersonalColorPicker';
import { ThemeSelector } from '@/components/settings/ThemeSelector';
import { CardCustomizationSettings } from '@/components/tasks/CardCustomizationSettings';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';

export default function UserPreferencesPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState('appearance');
  const {
    preferences,
    updateTaskBoardPreferences,
    updatePositionsPreferences,
    updateAppearancePreferences,
    updateSidebarPreferences,
    resetTaskBoardPreferences,
    resetPositionsPreferences,
    resetAppearancePreferences,
    resetSidebarPreferences,
    resetAllPreferences,
    isLoaded,
    isLoading,
    isAuthenticated
  } = useUserPreferences();

  // Memoize the task board preferences to prevent unnecessary re-renders
  const memoizedTaskBoardPreferences = useMemo(() => preferences.taskBoard, [
    preferences.taskBoard.cardWidth,
    preferences.taskBoard.customCardWidth,
    preferences.taskBoard.showAvatar,
    preferences.taskBoard.showName,
    preferences.taskBoard.showEmail,
    preferences.taskBoard.showDescription,
    preferences.taskBoard.showFitScore,
    preferences.taskBoard.showAssignee,
    preferences.taskBoard.showPriority,
    preferences.taskBoard.showDueDate,
    preferences.taskBoard.showTags,
    preferences.taskBoard.showSkills,
    preferences.taskBoard.showJobApplied,
    preferences.taskBoard.searchTerm,
    preferences.taskBoard.filterPriority,
    preferences.taskBoard.filterAssignee,
    preferences.taskBoard.selectedStages,
    preferences.taskBoard.viewMode
  ]);

  const handleResetAll = async () => {
    try {
      await resetAllPreferences();
      toast.success('All preferences reset to defaults');
    } catch (error) {
      toast.error('Failed to reset preferences');
    }
  };

  const handleResetTaskBoard = async () => {
    try {
      await resetTaskBoardPreferences();
      toast.success('Task board preferences reset to defaults');
    } catch (error) {
      toast.error('Failed to reset task board preferences');
    }
  };

  const handleResetPositions = async () => {
    try {
      await resetPositionsPreferences();
      toast.success('Positions preferences reset to defaults');
    } catch (error) {
      toast.error('Failed to reset positions preferences');
    }
  };

  const handleResetAppearance = async () => {
    try {
      await resetAppearancePreferences();
      toast.success('Appearance preferences reset to defaults');
    } catch (error) {
      toast.error('Failed to reset appearance preferences');
    }
  };

  const handleResetSidebar = async () => {
    try {
      await resetSidebarPreferences();
      toast.success('Sidebar preferences reset to defaults');
    } catch (error) {
      toast.error('Failed to reset sidebar preferences');
    }
  };

  const handlePersonalColorChange = (color: string) => {
    updateAppearancePreferences({ personalColor: color });
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    updateAppearancePreferences({ themePreference: theme });
  };

  // Show loading state
  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading preferences...</p>
        </div>
      </div>
    );
  }

  // Show authentication required message
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Authentication Required</h2>
          <p className="text-muted-foreground">
            You need to be signed in to manage your preferences. Your preferences are stored securely in the database and synced across all your devices.
          </p>
        </div>
      </div>
    );
  }

  // Show loading state while preferences are being loaded
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading your preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Preferences</h1>
          <p className="text-muted-foreground mt-2">
            Customize your experience and manage your personal settings
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Database className="w-4 h-4 text-green-600" />
            <span className="text-xs text-green-600 font-medium">Database Storage</span>
            <Badge variant="secondary" className="text-xs">
              Synced across devices
            </Badge>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={handleResetAll}
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset All
        </Button>
      </div>

      {/* Main Content with Tabs */}
      <div className="space-y-6">
        <div className="flex w-full border-b border-border/50">
          <div
            onClick={() => setActiveTab('appearance')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
              activeTab === 'appearance'
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <Palette className="w-4 h-4" />
            Appearance
          </div>
          <div
            onClick={() => setActiveTab('taskboard')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
              activeTab === 'taskboard'
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <Layout className="w-4 h-4" />
            Task Board
          </div>
          <div
            onClick={() => setActiveTab('positions')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
              activeTab === 'positions'
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <Filter className="w-4 h-4" />
            Positions
          </div>
          <div
            onClick={() => setActiveTab('sidebar')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
              activeTab === 'sidebar'
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <Layout className="w-4 h-4" />
            Sidebar
          </div>
        </div>

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Theme Preference Configuration */}
            <ThemeSelector
              themePreference={preferences.appearance.themePreference}
              onThemeChange={handleThemeChange}
            />
            
            {/* Personal Color Configuration */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="w-5 h-5" />
                      Personal Color
                    </CardTitle>
                    <CardDescription>
                      Choose your personal color theme for UI elements
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleResetAppearance}
                  >
                    Reset
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <PersonalColorPicker
                  personalColor={preferences.appearance.personalColor}
                  onColorChange={handlePersonalColorChange}
                  className="w-full"
                />
              </CardContent>
            </Card>
            
            {/* Current Appearance Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Current Settings
                </CardTitle>
                <CardDescription>
                  Overview of your current appearance configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Theme Preference</span>
                    <Badge variant="secondary">
                      {preferences.appearance.themePreference}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Personal Color</span>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full border border-border"
                        style={{ backgroundColor: preferences.appearance.personalColor }}
                      />
                      <Badge variant="secondary">
                        {preferences.appearance.personalColor}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Task Board Tab */}
        {activeTab === 'taskboard' && (
          <div className="space-y-6">
            {/* Card Customization Settings */}
            <CardCustomizationSettings
              preferences={memoizedTaskBoardPreferences}
              onUpdatePreferences={updateTaskBoardPreferences}
              onResetPreferences={resetTaskBoardPreferences}
              isSaving={false}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Settings Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Current Settings
                    </CardTitle>
                    <CardDescription>
                      Overview of your current task board configuration
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleResetTaskBoard}
                  >
                    Reset
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">View Mode</span>
                    <Badge variant="secondary">
                      {memoizedTaskBoardPreferences.viewMode}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Search Term</span>
                    <Badge variant="secondary">
                      {memoizedTaskBoardPreferences.searchTerm || 'None'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Priority Filter</span>
                    <Badge variant="secondary">
                      {memoizedTaskBoardPreferences.filterPriority}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Assignee Filter</span>
                    <Badge variant="secondary">
                      {memoizedTaskBoardPreferences.filterAssignee}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Selected Stages</span>
                    <Badge variant="secondary">
                      {memoizedTaskBoardPreferences.selectedStages.length} stage(s)
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reset Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5" />
                  Reset Options
                </CardTitle>
                <CardDescription>
                  Reset your task board preferences to default values
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                          Reset Task Board Settings
                        </h4>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          This will reset all your task board preferences to their default values. This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleResetTaskBoard}
                    className="w-full"
                  >
                    Reset Task Board Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
            </div>
          </div>
        )}

        {/* Positions Tab */}
        {activeTab === 'positions' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Settings Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Current Settings
                    </CardTitle>
                    <CardDescription>
                      Overview of your current positions configuration
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleResetPositions}
                  >
                    Reset
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Search Term</span>
                    <Badge variant="secondary">
                      {preferences.positions.searchTerm || 'None'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Department Filter</span>
                    <Badge variant="secondary">
                      {preferences.positions.departmentFilter}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Status Filter</span>
                    <Badge variant="secondary">
                      {preferences.positions.statusFilter}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Selected Recruiter</span>
                    <Badge variant="secondary">
                      {preferences.positions.selectedRecruiterId || 'None'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Page Size</span>
                    <Badge variant="secondary">
                      {preferences.positions.pageSize} items
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Sort By</span>
                    <Badge variant="secondary">
                      {preferences.positions.sortBy}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Sort Order</span>
                    <Badge variant="secondary">
                      {preferences.positions.sortOrder}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reset Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5" />
                  Reset Options
                </CardTitle>
                <CardDescription>
                  Reset your positions preferences to default values
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                          Reset Positions Settings
                        </h4>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          This will reset all your positions preferences to their default values. This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleResetPositions}
                    className="w-full"
                  >
                    Reset Positions Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sidebar Preferences Tab */}
        {activeTab === 'sidebar' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  Sidebar Preferences
                </CardTitle>
                <CardDescription>
                  Customize how your sidebar displays information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Show Assigned Positions Switch */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="showAssignedPositions" className="text-sm font-medium">
                      Show Assigned Positions
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Display your assigned open positions in the main sidebar with headcount information
                    </p>
                  </div>
                  <Switch
                    id="showAssignedPositions"
                    checked={preferences.sidebar.showAssignedPositions}
                    onCheckedChange={(checked) => updateSidebarPreferences({ showAssignedPositions: checked })}
                  />
                </div>

                {/* Reset Button */}
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    onClick={handleResetSidebar}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset Sidebar Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Information Card */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">About User Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Your preferences are automatically saved to the database and will persist across all your devices and browser sessions.
            These settings are securely stored and synced in real-time.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-md">
              <Database className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-green-800 dark:text-green-200 font-medium text-xs">Database Storage</p>
                <p className="text-green-700 dark:text-green-300 text-xs">Securely stored</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md">
              <Globe className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-blue-800 dark:text-blue-200 font-medium text-xs">Cross-Device Sync</p>
                <p className="text-blue-700 dark:text-blue-300 text-xs">Available everywhere</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-md">
              <User className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-purple-800 dark:text-purple-200 font-medium text-xs">Personalized</p>
                <p className="text-purple-700 dark:text-purple-300 text-xs">Tailored to you</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
