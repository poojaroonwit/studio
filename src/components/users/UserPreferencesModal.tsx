"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  RotateCcw, 
  Settings, 
  Filter, 
  Eye, 
  Loader2, 
  Database, 
  AlertCircle,
  Palette,
  Layout,
  User,
  Bell,
  Monitor,
  Smartphone,
  Globe,
  Save,
  X
} from 'lucide-react';
import { PersonalColorPicker } from '@/components/settings/PersonalColorPicker';
import { toast } from 'react-hot-toast';
import { useModalSave } from '@/hooks/use-modal-save';
import type { UserProfile } from '@/lib/types';

interface TaskBoardPreferences {
  searchTerm: string;
  filterPriority: string;
  filterAssignee: string;
  selectedStages: string[];
  viewMode: 'kanban' | 'table';
}

interface PositionsPreferences {
  searchTerm: string;
  departmentFilter: string;
  statusFilter: string;
  selectedRecruiterId: string | null;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface AppearancePreferences {
  personalColor: string;
}

interface SidebarPreferences {
  showAssignedPositions: boolean;
}

interface UserPreferences {
  taskBoard: TaskBoardPreferences;
  positions: PositionsPreferences;
  appearance: AppearancePreferences;
  sidebar: SidebarPreferences;
}

interface UserPreferencesModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
}

export function UserPreferencesModal({ isOpen, onOpenChange, user }: UserPreferencesModalProps) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize modal save hook for consistent save operations
  const { isSaving: isModalSaving, save: saveWithModal } = useModalSave(onOpenChange, {
    successMessage: "User preferences updated successfully!",
    errorMessage: "Failed to update user preferences. Please try again.",
    loadingMessage: "Saving preferences...",
    closeModalDelay: 500,
    onSuccess: () => {
      setHasChanges(false);
    }
  });

  // Load user preferences when modal opens
  useEffect(() => {
    if (isOpen && user) {
      loadUserPreferences();
    }
  }, [isOpen, user]);

  const loadUserPreferences = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/user-preferences/${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        // Ensure sidebar preferences exist even if not in database
        const preferencesWithSidebar = {
          ...data,
          sidebar: {
            showAssignedPositions: false,
            ...data.sidebar
          }
        };

        setPreferences(preferencesWithSidebar);
      } else {
        // Use default preferences if none exist
        setPreferences({
          taskBoard: {
            searchTerm: '',
            filterPriority: 'all',
            filterAssignee: 'all',
            selectedStages: [],
            viewMode: 'kanban',
          },
          positions: {
            searchTerm: '',
            departmentFilter: 'all',
            statusFilter: 'all',
            selectedRecruiterId: null,
            pageSize: 20,
            sortBy: 'createdAt',
            sortOrder: 'desc',
          },
          appearance: {
            personalColor: '#3B82F6',
          },
          sidebar: {
            showAssignedPositions: true,
          },
        });
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
      toast.error('Failed to load user preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const updateTaskBoardPreferences = (updates: Partial<TaskBoardPreferences>) => {
    if (!preferences) return;
    
    setPreferences(prev => ({
      ...prev!,
      taskBoard: { ...prev!.taskBoard, ...updates }
    }));
    setHasChanges(true);
  };

  const updatePositionsPreferences = (updates: Partial<PositionsPreferences>) => {
    if (!preferences) return;
    
    setPreferences(prev => ({
      ...prev!,
      positions: { ...prev!.positions, ...updates }
    }));
    setHasChanges(true);
  };

  const updateAppearancePreferences = (updates: Partial<AppearancePreferences>) => {
    if (!preferences) return;
    
    setPreferences(prev => ({
      ...prev!,
      appearance: { ...prev!.appearance, ...updates }
    }));
    setHasChanges(true);
  };

  const updateSidebarPreferences = (updates: Partial<SidebarPreferences>) => {
    if (!preferences) return;
    
    setPreferences(prev => ({
      ...prev!,
      sidebar: { ...prev!.sidebar, ...updates }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!user || !preferences) return;
    
    try {
      await saveWithModal(async () => {
        const response = await fetch(`/api/user-preferences/${user.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(preferences),
          credentials: 'include'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update user preferences');
        }
      });
    } catch (error) {
      // Error handling is done by the useModalSave hook
      console.error('Error saving user preferences:', error);
    }
  };

  const handleCancel = () => {
    setHasChanges(false);
    onOpenChange(false);
  };

  if (!user) {
    return null;
  }

  const isRecruiter = user.role === 'Recruiter';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden" dialogId="user-preferences-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            User Preferences - {user.name}
          </DialogTitle>
          <DialogDescription>
            Manage user preferences and personal settings
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Loading preferences...</p>
            </div>
          </div>
        ) : preferences ? (
          <div className="flex flex-col h-full">
            <Tabs defaultValue="appearance" className="flex-1 flex flex-col h-full">
              <div className="border-b px-6 bg-background/95 backdrop-blur-sm sticky top-0 z-10 w-full">
                <TabsList className="h-12 bg-transparent p-0 gap-6 w-full justify-start overflow-x-auto no-scrollbar">
                  <TabsTrigger 
                    value="appearance"
                    className="h-12 !rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 font-medium transition-all"
                  >
                    Appearance
                  </TabsTrigger>
                  <TabsTrigger 
                    value="taskBoard"
                    className="h-12 !rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 font-medium transition-all"
                  >
                    Task Board
                  </TabsTrigger>
                  <TabsTrigger 
                    value="positions"
                    className="h-12 !rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 font-medium transition-all"
                  >
                    Positions
                  </TabsTrigger>
                  <TabsTrigger 
                    value="sidebar"
                    className="h-12 !rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 font-medium transition-all"
                  >
                    Sidebar
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="appearance" className="space-y-6 p-6 mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <PersonalColorPicker 
                      personalColor={preferences.appearance.personalColor}
                      onColorChange={(color) => updateAppearancePreferences({ personalColor: color })}
                    />
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="w-5 h-5" />
                          Profile Image
                        </CardTitle>
                        <CardDescription>
                          Manage your profile image and avatar
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center justify-center p-6 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                          <div className="text-center">
                            <User className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                              Profile image management will be available here
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Task Board Tab */}
                <TabsContent value="taskBoard" className="space-y-6 p-6 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Layout className="w-5 h-5" />
                        Task Board Preferences
                      </CardTitle>
                      <CardDescription>
                        Configure task board display and filtering preferences
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="view-mode">Default View Mode</Label>
                          <select
                            id="view-mode"
                            value={preferences.taskBoard.viewMode}
                            onChange={(e) => updateTaskBoardPreferences({ viewMode: e.target.value as 'kanban' | 'table' })}
                            className="px-3 py-2 border border-border rounded-md bg-background"
                          >
                            <option value="kanban">Kanban Board</option>
                            <option value="table">Table View</option>
                          </select>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="priority-filter">Default Priority Filter</Label>
                          <select
                            id="priority-filter"
                            value={preferences.taskBoard.filterPriority}
                            onChange={(e) => updateTaskBoardPreferences({ filterPriority: e.target.value })}
                            className="px-3 py-2 border border-border rounded-md bg-background"
                          >
                            <option value="all">All Priorities</option>
                            <option value="high">High Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="low">Low Priority</option>
                          </select>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="assignee-filter">Default Assignee Filter</Label>
                          <select
                            id="assignee-filter"
                            value={preferences.taskBoard.filterAssignee}
                            onChange={(e) => updateTaskBoardPreferences({ filterAssignee: e.target.value })}
                            className="px-3 py-2 border border-border rounded-md bg-background"
                          >
                            <option value="all">All Assignees</option>
                            <option value="me">Assigned to Me</option>
                            <option value="unassigned">Unassigned</option>
                          </select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Positions Tab */}
                <TabsContent value="positions" className="space-y-6 p-6 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Filter className="w-5 h-5" />
                        Positions Preferences
                      </CardTitle>
                      <CardDescription>
                        Configure positions page display and filtering preferences
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="page-size">Default Page Size</Label>
                          <select
                            id="page-size"
                            value={preferences.positions.pageSize}
                            onChange={(e) => updatePositionsPreferences({ pageSize: parseInt(e.target.value) })}
                            className="px-3 py-2 border border-border rounded-md bg-background"
                          >
                            <option value={10}>10 items</option>
                            <option value={20}>20 items</option>
                            <option value={50}>50 items</option>
                            <option value={100}>100 items</option>
                          </select>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="sort-by">Default Sort By</Label>
                          <select
                            id="sort-by"
                            value={preferences.positions.sortBy}
                            onChange={(e) => updatePositionsPreferences({ sortBy: e.target.value })}
                            className="px-3 py-2 border border-border rounded-md bg-background"
                          >
                            <option value="createdAt">Created Date</option>
                            <option value="title">Title</option>
                            <option value="department">Department</option>
                            <option value="status">Status</option>
                          </select>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="sort-order">Default Sort Order</Label>
                          <select
                            id="sort-order"
                            value={preferences.positions.sortOrder}
                            onChange={(e) => updatePositionsPreferences({ sortOrder: e.target.value as 'asc' | 'desc' })}
                            className="px-3 py-2 border border-border rounded-md bg-background"
                          >
                            <option value="desc">Descending</option>
                            <option value="asc">Ascending</option>
                          </select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Sidebar Tab - Available for all users */}
                <TabsContent value="sidebar" className="space-y-6 p-6 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Layout className="w-5 h-5" />
                          Sidebar Preferences
                        </CardTitle>
                        <CardDescription>
                          Configure sidebar display and information preferences
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Show Assigned Positions Switch */}
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label htmlFor="modal-showAssignedPositions" className="text-sm font-medium">
                              Show Assigned Positions
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Display assigned open positions in the main sidebar with headcount information
                            </p>
                          </div>
                          <Switch
                            id="modal-showAssignedPositions"
                            checked={preferences?.sidebar?.showAssignedPositions || false}
                            onCheckedChange={(checked) => updateSidebarPreferences({ showAssignedPositions: checked })}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
              </div>
            </Tabs>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 bg-muted/30 backdrop-blur-sm sticky bottom-0 z-20">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="w-4 h-4" />
                <span>Database Storage</span>
                {hasChanges && (
                  <Badge variant="secondary" className="text-xs">
                    Unsaved Changes
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isModalSaving}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={isModalSaving || !hasChanges}
                >
                  {isModalSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
