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
  Warning,
  AlertCircle,
  AlertOctagon,
  User,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Search,
  XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WarningConfigurationEditDrawer } from '@/components/warnings/WarningConfigurationEditDrawer';

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

interface UserWarningConfigurationsProps {
  userId: string;
  userName: string;
}

const SEVERITY_ICONS = {
  info: Info,
  warning: Warning,
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

export function UserWarningConfigurations({ userId, userName }: UserWarningConfigurationsProps) {
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
    fetchConfigurations();
  }, [userId]);

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

  const handleToggleConfiguration = async (configId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}/warning-configurations/${configId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        showSuccess(`Configuration ${isActive ? 'activated' : 'deactivated'} successfully`);
        fetchConfigurations();
      } else {
        showError('Failed to update configuration');
      }
    } catch (error) {
      console.error('Error updating configuration:', error);
      showError('Failed to update configuration');
    }
  };

  const handleSaveConfiguration = () => {
    setIsModalOpen(false);
    fetchConfigurations();
  };

  const getSeverityIcon = (severity: string) => {
    const Icon = SEVERITY_ICONS[severity as keyof typeof SEVERITY_ICONS] || AlertTriangle;
    return <Icon className="h-4 w-4" />;
  };

  const getEntityIcon = (entityType: string) => {
    const Icon = ENTITY_ICONS[entityType as keyof typeof ENTITY_ICONS] || Target;
    return <Icon className="h-4 w-4" />;
  };

  const getConditionIcon = (condition: string) => {
    const Icon = CONDITION_ICONS[condition as keyof typeof CONDITION_ICONS] || AlertTriangle;
    return <Icon className="h-4 w-4" />;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'warning':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Warning Configurations
          </h3>
          <p className="text-sm text-muted-foreground">
            Loading {userName}'s warning configurations...
          </p>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Warning Configurations
            </h3>
            <p className="text-sm text-muted-foreground">
              Manage {userName}'s personal warning configurations
            </p>
          </div>
          <Button onClick={handleCreateConfiguration} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Configuration
          </Button>
        </div>
        <div className="space-y-4">
          {configurations.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No warning configurations found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first warning configuration to start monitoring
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {configurations.map((config) => (
                <div
                  key={config.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                                       <div className="flex items-center gap-3 flex-1">
                       {(() => {
                         const conditionInfo = getConditionInfo(config);
                         return (
                           <div className="flex items-center gap-2">
                             {getSeverityIcon(config.severity)}
                             {getEntityIcon(conditionInfo.entityType)}
                             {getConditionIcon(conditionInfo.condition)}
                           </div>
                         );
                       })()}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{config.name}</h4>
                        <Badge 
                          variant="secondary" 
                          className={getSeverityColor(config.severity)}
                        >
                          {config.severity}
                        </Badge>
                        {!config.isActive && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      
                      {config.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {config.description}
                        </p>
                      )}
                      
                                             <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                         {(() => {
                           const conditionInfo = getConditionInfo(config);
                           return (
                             <>
                               <span>{conditionInfo.entityType}</span>
                               <span>•</span>
                               <span>{conditionInfo.field}</span>
                               <span>•</span>
                               <span>{conditionInfo.condition}</span>
                             </>
                           );
                         })()}
                       </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.isActive}
                        onCheckedChange={(checked) => handleToggleConfiguration(config.id, checked)}
                      />
                      <Label className="text-sm">Active</Label>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditConfiguration(config)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteConfiguration(config.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <WarningConfigurationEditDrawer
        isOpen={isModalOpen}
        onOpenChange={() => setIsModalOpen(false)}
        configuration={editingConfiguration}
        userId={userId}
      />
    </>
  );
}
