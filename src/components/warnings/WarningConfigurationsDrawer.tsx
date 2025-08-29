"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Clock, 
  Target,
  Hash,
  Calendar,
  Zap,
  Info,
  AlertCircle,
  AlertOctagon,
  User,
  X,
  MoreHorizontal,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Search,
  XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WarningConfigurationEditDrawer } from '@/components/warnings/WarningConfigurationEditDrawer';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WarningConfiguration {
  id: string;
  name: string;
  description?: string;
  entityType?: string;
  field?: string;
  condition?: string;
  operator?: string;
  value?: string;
  threshold?: number;
  severity: string;
  isActive: boolean;
  isPublic?: boolean;
  conditionGroups?: any[];
  createdBy?: string;
  createdByUser?: {
    id: string;
    name: string;
    email: string;
  };
}

interface WarningConfigurationsDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName?: string;
  isCurrentUser?: boolean;
}

const SEVERITY_ICONS = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  critical: AlertOctagon,
};

const ENTITY_ICONS = {
  position: Target,
  candidate: Eye,
  headcount: Hash,
};

const CONDITION_ICONS = {
  // Legacy condition types
  overdue: Clock,
  empty: AlertTriangle,
  threshold: Target,
  date_range: Calendar,
  custom: Zap,
  // New condition types
  is_empty: AlertTriangle,
  is_not_empty: CheckCircle,
  equals: Hash,
  greater_than: TrendingUp,
  less_than: TrendingDown,
  contains: Search,
  days_ago: Clock,
  is_true: CheckCircle,
  is_false: XCircle,
};

export function WarningConfigurationsDrawer({ 
  isOpen, 
  onOpenChange, 
  userId, 
  userName,
  isCurrentUser = false 
}: WarningConfigurationsDrawerProps) {
  const { success: showSuccess, error: showError } = useToast();
  const [configurations, setConfigurations] = useState<WarningConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfiguration, setEditingConfiguration] = useState<WarningConfiguration | null>(null);

  // Fetch user's warning configurations
  const fetchConfigurations = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/warning-configurations`);
      if (response.ok) {
        const data = await response.json();
        setConfigurations(data);
      } else {
        showError('Failed to load warning configurations');
      }
    } catch (error) {
      console.error('Error fetching configurations:', error);
      showError('Failed to load warning configurations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConfigurations();
    }
  }, [isOpen, userId]);

  const handleCreateConfiguration = () => {
    setEditingConfiguration(null);
    setIsModalOpen(true);
  };

  const handleEditConfiguration = (config: WarningConfiguration) => {
    setEditingConfiguration(config);
    setIsModalOpen(true);
  };

  const handleDeleteConfiguration = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this warning configuration?')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}/warning-configurations/${configId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showSuccess('Warning configuration deleted successfully');
        fetchConfigurations();
      } else {
        showError('Failed to delete warning configuration');
      }
    } catch (error) {
      console.error('Error deleting configuration:', error);
      showError('Failed to delete warning configuration');
    }
  };

  const handleToggleActive = async (configId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}/warning-configurations/${configId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        showSuccess(`Warning configuration ${isActive ? 'activated' : 'deactivated'} successfully`);
        fetchConfigurations();
      } else {
        showError('Failed to update warning configuration');
      }
    } catch (error) {
      console.error('Error updating configuration:', error);
      showError('Failed to update warning configuration');
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingConfiguration(null);
    fetchConfigurations();
  };

  const getSeverityIcon = (severity: string) => {
    const IconComponent = SEVERITY_ICONS[severity as keyof typeof SEVERITY_ICONS] || AlertTriangle;
    return <IconComponent className="h-4 w-4" />;
  };

  const getEntityIcon = (entityType: string) => {
    const IconComponent = ENTITY_ICONS[entityType as keyof typeof ENTITY_ICONS] || Settings;
    return <IconComponent className="h-4 w-4" />;
  };

  const getConditionIcon = (condition: string) => {
    const IconComponent = CONDITION_ICONS[condition as keyof typeof CONDITION_ICONS] || Settings;
    return <IconComponent className="h-4 w-4" />;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'critical': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  // Helper function to extract condition information from conditionGroups
  const getConditionInfo = (config: WarningConfiguration) => {
    // Check if using new conditionGroups format
    if (config.conditionGroups && Array.isArray(config.conditionGroups) && config.conditionGroups.length > 0) {
      const firstGroup = config.conditionGroups[0];
      if (firstGroup && firstGroup.conditions && Array.isArray(firstGroup.conditions) && firstGroup.conditions.length > 0) {
        const firstCondition = firstGroup.conditions[0];
        return {
          entityType: firstCondition.entityType || 'unknown',
          condition: firstCondition.condition || 'custom',
          field: firstCondition.field || 'unknown'
        };
      }
    }
    
    // Fallback to legacy fields
    return {
      entityType: config.entityType || 'unknown',
      condition: config.condition || 'custom',
      field: config.field || 'unknown'
    };
  };

  return (
    <>
             <Sheet open={isOpen} onOpenChange={onOpenChange}>
         <SheetContent 
           className="!w-[40vw] !max-w-[40vw] !min-w-[600px] overflow-y-auto"
           style={{ 
             width: '40vw', 
             maxWidth: '40vw', 
             minWidth: '600px' 
           }}
         >
          <SheetHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-xl font-semibold">
                    Warning Configurations
                  </SheetTitle>
                  <SheetDescription>
                    {isCurrentUser ? 'Manage your warning configurations' : `Manage warning configurations for ${userName}`}
                  </SheetDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  {configurations.length} Configuration{configurations.length !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  {Array.isArray(configurations) ? configurations.filter(c => c.isActive).length : 0} Active
                </Badge>
              </div>
              <Button onClick={handleCreateConfiguration} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Configuration
              </Button>
            </div>

            <Separator />

            {/* Configurations List */}
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading configurations...</p>
              </div>
            ) : configurations.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No warning configurations found</p>
                <Button onClick={handleCreateConfiguration} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Configuration
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {configurations.map((config) => (
                  <div
                    key={config.id}
                    className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted">
                          {getSeverityIcon(config.severity)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">{config.name}</h4>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${getSeverityColor(config.severity)}`}
                            >
                              {config.severity}
                            </Badge>
                            {config.isPublic && (
                              <Badge variant="outline" className="text-xs">
                                Public
                              </Badge>
                            )}
                          </div>
                          {config.description && (
                            <p className="text-xs text-muted-foreground mb-2">
                              {config.description}
                            </p>
                          )}
                                                     <div className="flex items-center gap-4 text-xs text-muted-foreground">
                             {(() => {
                               const conditionInfo = getConditionInfo(config);
                               return (
                                 <>
                                   <div className="flex items-center gap-1">
                                     {getEntityIcon(conditionInfo.entityType)}
                                     <span className="capitalize">{conditionInfo.entityType}</span>
                                   </div>
                                   <div className="flex items-center gap-1">
                                     {getConditionIcon(conditionInfo.condition)}
                                     <span className="capitalize">{conditionInfo.condition}</span>
                                   </div>
                                   <div className="flex items-center gap-1">
                                     <Hash className="h-3 w-3" />
                                     <span>{conditionInfo.field}</span>
                                   </div>
                                 </>
                               );
                             })()}
                           </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={config.isActive}
                          onCheckedChange={(checked) => handleToggleActive(config.id, checked)}
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditConfiguration(config)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteConfiguration(config.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Warning Configuration Edit Drawer */}
      <WarningConfigurationEditDrawer
        isOpen={isModalOpen}
        onOpenChange={handleModalClose}
        configuration={editingConfiguration}
        userId={userId}
      />
    </>
  );
}
