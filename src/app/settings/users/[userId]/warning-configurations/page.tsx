"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { sanitizeUrl } from '@/lib/security';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Search,
  Filter,
  MoreHorizontal,
  ArrowLeft,
  Download,
  Upload,
  FileText,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WarningConfigurationEditDrawer } from '@/components/warnings/WarningConfigurationEditDrawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
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

export default function UserWarningConfigurationsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { success: showSuccess, error: showError } = useToast();
  const [configurations, setConfigurations] = useState<WarningConfiguration[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [editingConfiguration, setEditingConfiguration] = useState<WarningConfiguration | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const userId = params.userId as string;

  // Fetch user details
  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        showError('Failed to load user details');
        router.push('/settings/users');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      showError('Failed to load user details');
      router.push('/settings/users');
    }
  };

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
    if (userId) {
      fetchUser();
      fetchConfigurations();
    }
  }, [userId]);

  const handleCreateConfiguration = () => {
    setEditingConfiguration(null);
    setIsEditDrawerOpen(true);
  };

  const handleEditConfiguration = (config: WarningConfiguration) => {
    setEditingConfiguration(config);
    setIsEditDrawerOpen(true);
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

  const handleEditDrawerClose = () => {
    setIsEditDrawerOpen(false);
    setEditingConfiguration(null);
    fetchConfigurations();
  };

  // Export all configurations to JSON
  const exportAllConfigurations = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/warning-configurations/bulk`);
      if (!response.ok) {
        throw new Error('Failed to export configurations');
      }

      const exportData = await response.json();

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `warning-configurations-${exportData.user?.name || 'user'}-${new Date().toISOString().split('T')[0]}.json`;

      // SECURITY: Verify the URL is a safe blob URL before adding to DOM
      // SECURITY: Verify the URL is a safe blob URL before adding to DOM
      const safeUrl = sanitizeUrl(url);
      if (safeUrl) {
        a.href = safeUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);

      showSuccess(`Successfully exported ${exportData.totalCount} configurations`);
    } catch (error) {
      console.error('Error exporting configurations:', error);
      showError('Failed to export configurations');
    }
  };

  // Import configurations from JSON
  const importConfigurations = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const importData = JSON.parse(content);

        // Validate the imported data
        if (!importData.configurations || !Array.isArray(importData.configurations)) {
          throw new Error('Invalid configuration format: missing configurations array');
        }

        if (importData.configurations.length === 0) {
          throw new Error('No configurations found in import file');
        }

        // Use bulk import API
        const response = await fetch(`/api/users/${userId}/warning-configurations/bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ configurations: importData.configurations }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to import configurations');
        }

        const result = await response.json();

        // Refresh the configurations list
        fetchConfigurations();

        if (result.summary.failed === 0) {
          showSuccess(`Successfully imported ${result.summary.successful} configurations`);
        } else {
          showSuccess(`Import completed: ${result.summary.successful} successful, ${result.summary.failed} failed`);
        }
      } catch (error) {
        console.error('Error importing configurations:', error);
        showError(`Failed to import configurations: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    reader.readAsText(file);

    // Reset the input
    event.target.value = '';
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
          field: firstCondition.field || 'unknown',
          totalGroups: config.conditionGroups.length,
          totalConditions: config.conditionGroups.reduce((sum: number, group: any) => sum + (group.conditions?.length || 0), 0)
        };
      } else {
        // Has conditionGroups but no valid conditions - show as custom
        return {
          entityType: 'custom',
          condition: 'custom',
          field: 'custom',
          totalGroups: config.conditionGroups.length,
          totalConditions: 0
        };
      }
    }

    // Fallback to legacy fields
    return {
      entityType: config.entityType || 'unknown',
      condition: config.condition || 'custom',
      field: config.field || 'unknown',
      totalGroups: 0,
      totalConditions: 0
    };
  };

  // Filter configurations
  const filteredConfigurations = configurations.filter(config => {
    const conditionInfo = getConditionInfo(config);
    const matchesSearch = config.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (config.description && config.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSeverity = severityFilter === 'all' || config.severity === severityFilter;
    const matchesEntityType = entityTypeFilter === 'all' || conditionInfo.entityType === entityTypeFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && config.isActive) ||
      (statusFilter === 'inactive' && !config.isActive);

    return matchesSearch && matchesSeverity && matchesEntityType && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading warning configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/settings/users')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Users
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Warning Configurations for {user?.name}
              </h1>
              <p className="text-muted-foreground">
                Manage warning configurations for {user?.name} ({user?.email})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={exportAllConfigurations}
              disabled={configurations.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export All
            </Button>
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={importConfigurations}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="import-configs-user"
              />
              <Button
                variant="outline"
                className="flex items-center gap-2"
                asChild
              >
                <label htmlFor="import-configs-user">
                  <Upload className="h-4 w-4" />
                  Import
                </label>
              </Button>
            </div>
            <Button onClick={handleCreateConfiguration}>
              <Plus className="mr-2 h-4 w-4" />
              New Configuration
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Configurations</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{configurations.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {(() => {
                  try {
                    // Defensive check to prevent filter errors
                    if (!Array.isArray(configurations)) {
                      console.warn('WarningConfigurationsPage: configurations is not an array:', configurations);
                      return 0;
                    }

                    return configurations.filter(c => {
                      try {
                        return c && c.isActive;
                      } catch (error) {
                        console.warn('WarningConfigurationsPage: Error filtering active configuration:', error, c);
                        return false;
                      }
                    }).length;
                  } catch (error) {
                    console.error('WarningConfigurationsPage: Error counting active configurations:', error);
                    return 0;
                  }
                })()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {(() => {
                  try {
                    // Defensive check to prevent filter errors
                    if (!Array.isArray(configurations)) {
                      console.warn('WarningConfigurationsPage: configurations is not an array:', configurations);
                      return 0;
                    }

                    return configurations.filter(c => {
                      try {
                        return c && !c.isActive;
                      } catch (error) {
                        console.warn('WarningConfigurationsPage: Error filtering inactive configuration:', error, c);
                        return false;
                      }
                    }).length;
                  } catch (error) {
                    console.error('WarningConfigurationsPage: Error counting inactive configurations:', error);
                    return 0;
                  }
                })()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Public</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {(() => {
                  try {
                    // Defensive check to prevent filter errors
                    if (!Array.isArray(configurations)) {
                      console.warn('WarningConfigurationsPage: configurations is not an array:', configurations);
                      return 0;
                    }

                    return configurations.filter(c => {
                      try {
                        return c && c.isPublic;
                      } catch (error) {
                        console.warn('WarningConfigurationsPage: Error filtering public configuration:', error, c);
                        return false;
                      }
                    }).length;
                  } catch (error) {
                    console.error('WarningConfigurationsPage: Error counting public configurations:', error);
                    return 0;
                  }
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search configurations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              <SelectItem value="position">Position</SelectItem>
              <SelectItem value="candidate">Candidate</SelectItem>
              <SelectItem value="headcount">Headcount</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Configurations List */}
      <div className="flex-1 px-6 pb-6">
        {filteredConfigurations.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              {configurations.length === 0
                ? "No warning configurations found for this user"
                : "No configurations match your filters"}
            </p>
            {configurations.length === 0 && (
              <Button onClick={handleCreateConfiguration} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create First Configuration
              </Button>
            )}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Configuration</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConfigurations.map((config) => (
                  <TableRow key={config.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted">
                          {getSeverityIcon(config.severity)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{config.name}</h4>
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
                            <p className="text-xs text-muted-foreground truncate max-w-xs">
                              {config.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const conditionInfo = getConditionInfo(config);
                          return (
                            <>
                              {getEntityIcon(conditionInfo.entityType)}
                              <span className="capitalize text-sm">{conditionInfo.entityType}</span>
                            </>
                          );
                        })()}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Switch
                        checked={config.isActive}
                        onCheckedChange={(checked) => handleToggleActive(config.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Warning Configuration Edit Drawer */}
      <WarningConfigurationEditDrawer
        isOpen={isEditDrawerOpen}
        onOpenChange={handleEditDrawerClose}
        configuration={editingConfiguration}
        userId={userId}
      />
    </div>
  );
}
