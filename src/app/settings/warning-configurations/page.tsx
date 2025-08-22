"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Plus, Edit, Trash2, Settings, Eye, EyeOff, Share2 } from 'lucide-react';
import { WarningConfigurationModal } from '@/components/settings/WarningConfigurationModal';
import { WarningConfigurationShareModal } from '@/components/settings/WarningConfigurationShareModal';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface WarningConfiguration {
  id: string;
  name: string;
  description?: string;
  entityType: string;
  field: string;
  condition: string;
  operator: string;
  value?: string;
  threshold?: number;
  severity: string;
  isActive: boolean;
  isPublic?: boolean;
  createdBy?: string;
  createdByUser?: {
    id: string;
    name: string;
    email: string;
  };
  sharedWith?: Array<{
    id: string;
    userId: string;
    canEdit: boolean;
    canDelete: boolean;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function WarningConfigurationsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const { success, error: showError } = useToast();
  const [configurations, setConfigurations] = useState<WarningConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfiguration, setEditingConfiguration] = useState<WarningConfiguration | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharingConfiguration, setSharingConfiguration] = useState<WarningConfiguration | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const fetchConfigurations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings/warning-configurations');
      if (response.ok) {
        const data = await response.json();
        setConfigurations(data);
      }
    } catch (error) {
      console.error('Error fetching warning configurations:', error);
      showError("Failed to load warning configurations");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchConfigurations();
    }
  }, [sessionStatus]);

  const handleCreateConfiguration = () => {
    setEditingConfiguration(null);
    setIsModalOpen(true);
  };

  const handleEditConfiguration = (configuration: WarningConfiguration) => {
    setEditingConfiguration(configuration);
    setIsModalOpen(true);
  };

  const handleDeleteConfiguration = async (id: string) => {
    if (!confirm('Are you sure you want to delete this warning configuration?')) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/warning-configurations/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        success("Warning configuration deleted successfully");
        fetchConfigurations();
      } else {
        throw new Error('Failed to delete configuration');
      }
    } catch (error) {
      console.error('Error deleting warning configuration:', error);
      showError("Failed to delete warning configuration");
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingConfiguration(null);
  };

  const handleModalSave = () => {
    fetchConfigurations();
    handleModalClose();
  };

  const handleShareConfiguration = (configuration: WarningConfiguration) => {
    setSharingConfiguration(configuration);
    setIsShareModalOpen(true);
  };

  const handleShareModalClose = () => {
    setIsShareModalOpen(false);
    setSharingConfiguration(null);
  };

  const handleShareModalUpdate = () => {
    fetchConfigurations();
  };

  const getEntityTypeLabel = (entityType: string) => {
    switch (entityType) {
      case 'position': return 'Position';
      case 'candidate': return 'Candidate';
      case 'headcount': return 'Headcount';
      default: return entityType;
    }
  };

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case 'overdue': return 'Overdue';
      case 'empty': return 'Empty';
      case 'threshold': return 'Threshold';
      case 'date_range': return 'Date Range';
      case 'custom': return 'Custom';
      default: return condition;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'warning': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'info': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredConfigurations = configurations.filter(config => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return config.isActive;
    if (activeTab === 'inactive') return !config.isActive;
    return config.entityType === activeTab;
  });

  if (sessionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (sessionStatus === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please sign in to access this page.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Warning Configurations</h1>
          <p className="text-muted-foreground">Configure dynamic warning rules for data monitoring</p>
        </div>
        <Button onClick={handleCreateConfiguration} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Configuration
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Tabs */}
          <div className="flex w-full border-b border-border/50 mb-6">
            <div
              onClick={() => setActiveTab('all')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'all'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <Settings className="h-4 w-4" />
              All
              <Badge variant="secondary" className="ml-1">
                {configurations.length}
              </Badge>
            </div>
            <div
              onClick={() => setActiveTab('active')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'active'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <Eye className="h-4 w-4" />
              Active
              <Badge variant="secondary" className="ml-1">
                {configurations.filter(c => c.isActive).length}
              </Badge>
            </div>
            <div
              onClick={() => setActiveTab('inactive')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'inactive'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <EyeOff className="h-4 w-4" />
              Inactive
              <Badge variant="secondary" className="ml-1">
                {configurations.filter(c => !c.isActive).length}
              </Badge>
            </div>
            <div
              onClick={() => setActiveTab('position')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'position'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <AlertTriangle className="h-4 w-4" />
              Positions
              <Badge variant="secondary" className="ml-1">
                {configurations.filter(c => c.entityType === 'position').length}
              </Badge>
            </div>
            <div
              onClick={() => setActiveTab('candidate')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'candidate'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <AlertTriangle className="h-4 w-4" />
              Candidates
              <Badge variant="secondary" className="ml-1">
                {configurations.filter(c => c.entityType === 'candidate').length}
              </Badge>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredConfigurations.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No warning configurations found</p>
                <Button onClick={handleCreateConfiguration} variant="outline">
                  Create your first configuration
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredConfigurations.map((configuration) => (
                  <Card key={configuration.id} className="transition-all duration-200 hover:shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg">{configuration.name}</CardTitle>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                configuration.isActive ? "border-green-200 text-green-700" : "border-gray-200 text-gray-500"
                              )}
                            >
                              {configuration.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", getSeverityColor(configuration.severity))}
                            >
                              {configuration.severity}
                            </Badge>
                          </div>
                          {configuration.description && (
                            <CardDescription className="text-sm">
                              {configuration.description}
                            </CardDescription>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {configuration.isPublic && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                Public
                              </Badge>
                            )}
                            {configuration.createdByUser && (
                              <span className="text-xs text-muted-foreground">
                                Created by {configuration.createdByUser.name}
                              </span>
                            )}
                            {configuration.sharedWith && configuration.sharedWith.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                Shared with {configuration.sharedWith.length} user{configuration.sharedWith.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShareConfiguration(configuration)}
                            className="h-8 w-8 p-0"
                            title="Share configuration"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditConfiguration(configuration)}
                            className="h-8 w-8 p-0"
                            title="Edit configuration"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteConfiguration(configuration.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            title="Delete configuration"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Entity Type:</span>
                          <p className="font-medium">{getEntityTypeLabel(configuration.entityType)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Field:</span>
                          <p className="font-medium">{configuration.field}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Condition:</span>
                          <p className="font-medium">{getConditionLabel(configuration.condition)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Operator:</span>
                          <p className="font-medium">{configuration.operator}</p>
                        </div>
                      </div>
                      {(configuration.value || configuration.threshold !== undefined) && (
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {configuration.value && (
                              <div>
                                <span className="text-muted-foreground">Value:</span>
                                <p className="font-medium">{configuration.value}</p>
                              </div>
                            )}
                            {configuration.threshold !== undefined && (
                              <div>
                                <span className="text-muted-foreground">Threshold:</span>
                                {configuration.threshold === null ? (
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-blue-600 dark:text-blue-400">Dynamic (Grade SLA)</p>
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                      Auto-adjusts
                                    </Badge>
                                  </div>
                                ) : (
                                  <p className="font-medium">{configuration.threshold} days</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Modals */}
      <WarningConfigurationModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        configuration={editingConfiguration}
      />
      
      {sharingConfiguration && (
        <WarningConfigurationShareModal
          isOpen={isShareModalOpen}
          onClose={handleShareModalClose}
          configurationId={sharingConfiguration.id}
          configurationName={sharingConfiguration.name}
          sharedUsers={sharingConfiguration.sharedWith || []}
          onUpdate={handleShareModalUpdate}
        />
      )}
    </div>
  );
}

