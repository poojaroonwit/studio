"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  AlertTriangle, 
  Clock, 
  AlertCircle, 
  Info, 
  User, 
  Building, 
  Users, 
  Settings,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  Eye,
  Calendar,
  Hash,
  Target,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  List,
  FileText
} from 'lucide-react';
import { useWarnings } from '@/contexts/WarningContext';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { PositionDetailDrawer } from '@/components/positions/PositionDetailDrawer';
import CandidateDetailModal from '@/components/candidates/CandidateDetailModal';

interface WarningDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewMode = 'criteria' | 'records' | 'details';

interface WarningCriteria {
  configurationId: string;
  name: string;
  description?: string;
  severity: string;
  entityType: string;
  field: string;
  condition: string;
  count: number;
  warnings: any[];
}

interface WarningRecord {
  id: string;
  entityType: string;
  entityId: string;
  entityName: string;
  field: string;
  currentValue?: string;
  expectedValue?: string;
  message: string;
  severity: string;
  createdAt: string;
}

export function WarningDrawer({ isOpen, onClose }: WarningDrawerProps) {
  const { data: session } = useSession();
  const { warnings, isLoading, fetchWarnings } = useWarnings();
  const { success: showSuccess, error: showError } = useToast();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>('criteria');
  const [selectedCriteria, setSelectedCriteria] = useState<WarningCriteria | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<WarningRecord | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [entityNames, setEntityNames] = useState<Record<string, string>>({});
  const [loadingEntities, setLoadingEntities] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Entity drawer/modal state
  const [isPositionDrawerOpen, setIsPositionDrawerOpen] = useState(false);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  // Reset view when drawer opens/closes
  useEffect(() => {
    if (!isOpen) {
      setViewMode('criteria');
      setSelectedCriteria(null);
      setSelectedRecord(null);
    }
  }, [isOpen]);

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Group warnings by configuration to create criteria list
  const warningCriteria = useCallback(() => {
    const criteriaMap = new Map<string, WarningCriteria>();
    
    warnings.forEach(warning => {
      const key = warning.configurationId;
      if (!criteriaMap.has(key)) {
        criteriaMap.set(key, {
          configurationId: warning.configurationId,
          name: warning.configuration?.name || 'Unknown Configuration',
          description: warning.configuration?.description,
          severity: warning.severity,
          entityType: warning.entityType,
          field: warning.field,
          condition: 'active', // We'll get this from configuration later
          count: 0,
          warnings: []
        });
      }
      
      const criteria = criteriaMap.get(key)!;
      criteria.count++;
      criteria.warnings.push(warning);
    });
    
    return Array.from(criteriaMap.values()).sort((a, b) => {
      // Sort by severity (error > warning > info) then by count
      const severityOrder = { error: 3, warning: 2, info: 1 };
      const aOrder = severityOrder[a.severity as keyof typeof severityOrder] || 0;
      const bOrder = severityOrder[b.severity as keyof typeof severityOrder] || 0;
      
      if (aOrder !== bOrder) return bOrder - aOrder;
      return b.count - a.count;
    });
  }, [warnings]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    }
  };

  const getSeverityColors = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50 dark:bg-red-950/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-900 dark:text-red-100',
          hover: 'hover:bg-red-100 dark:hover:bg-red-950/40',
          badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        };
      case 'error':
        return {
          bg: 'bg-red-50 dark:bg-red-950/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-900 dark:text-red-100',
          hover: 'hover:bg-red-100 dark:hover:bg-red-950/40',
          badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/20',
          border: 'border-amber-200 dark:border-amber-800',
          text: 'text-amber-900 dark:text-amber-100',
          hover: 'hover:bg-amber-100 dark:hover:bg-amber-950/40',
          badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
        };
      case 'info':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/20',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-900 dark:text-blue-100',
          hover: 'hover:bg-blue-100 dark:hover:bg-blue-950/40',
          badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-950/20',
          border: 'border-gray-200 dark:border-gray-800',
          text: 'text-gray-900 dark:text-gray-100',
          hover: 'hover:bg-gray-100 dark:hover:bg-gray-950/40',
          badge: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
        };
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'candidate':
        return <User className="h-4 w-4" />;
      case 'position':
        return <Building className="h-4 w-4" />;
      case 'headcount':
        return <Users className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  // Cleanup timeout on unmount to prevent resource leaks
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, []);

  const handleRefreshWarnings = async () => {
    setIsRefreshing(true);
    try {
      // Step 1: Clear resolved warnings
      const clearResponse = await fetch('/api/warnings/auto-clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (clearResponse.ok) {
        const clearResult = await clearResponse.json();
        // console.log('Cleared warnings:', clearResult);
      }

      // Small delay to ensure clear operation completes
      await new Promise(resolve => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
        refreshTimeoutRef.current = setTimeout(resolve, 1000);
      });

      // Step 2: Trigger warning checks for all entities
      const triggerResponse = await fetch('/api/warnings/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkAll: true // Check all entity types
        }),
      });

      if (triggerResponse.ok) {
        const triggerResult = await triggerResponse.json();
        // console.log('Triggered warning checks:', triggerResult);
      }

      // Small delay to ensure trigger operation completes
      await new Promise(resolve => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
        refreshTimeoutRef.current = setTimeout(resolve, 2000);
      });

      // Step 3: Refresh the warning list
      await fetchWarnings();
      
      showSuccess("Warnings refreshed - resolved warnings cleared and new warnings checked");
    } catch (error) {
      showError("Failed to refresh warnings");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCriteriaClick = (criteria: WarningCriteria) => {
    setSelectedCriteria(criteria);
    setViewMode('records');
    setCurrentPage(1); // Reset to first page when switching criteria
    setRecordsPerPage(10); // Reset to default page size
  };

  const handleRecordClick = (record: WarningRecord) => {
    setSelectedRecord(record);
    setViewMode('details');
  };

  const handleBackToCriteria = () => {
    setViewMode('criteria');
    setSelectedCriteria(null);
    setSelectedRecord(null);
    setCurrentPage(1); // Reset to first page
  };

  const handleBackToRecords = () => {
    setViewMode('records');
    setSelectedRecord(null);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleGoToPage = (page: number) => {
    if (page >= 1 && page <= Math.ceil((selectedCriteria?.warnings.length || 0) / recordsPerPage)) {
      setCurrentPage(page);
    }
  };

  const handleViewEntity = (entityType: string, entityId: string) => {
    if (entityType === 'position') {
      setSelectedPositionId(entityId);
      setIsPositionDrawerOpen(true);
    } else if (entityType === 'candidate') {
      setSelectedCandidateId(entityId);
      setIsCandidateModalOpen(true);
    } else {
      // For other entity types, fall back to window.open
      window.open(`/${entityType}s/${entityId}`, '_blank');
    }
  };

  const fetchEntityName = useCallback(async (entityType: string, entityId: string) => {
    const key = `${entityType}-${entityId}`;
    if (entityNames[key]) return entityNames[key];

    // Immediate fallback for unsupported entity endpoints (e.g., headcount has no /api/headcounts/[id])
    if (entityType === 'headcount') {
      const fallback = `Headcount ${entityId.slice(0, 8)}`;
      setEntityNames(prev => ({ ...prev, [key]: fallback }));
      return fallback;
    }

    // Add to loading set
    setLoadingEntities(prev => new Set(prev).add(key));

    try {
      const response = await fetch(`/api/${entityType}s/${entityId}`);
      if (response.ok) {
        const entity = await response.json();
        const name = entity.name || entity.title || `Unknown ${entityType}`;
        setEntityNames(prev => ({ ...prev, [key]: name }));
        return name;
      } else {
        const fallback = `Unknown ${entityType}`;
        setEntityNames(prev => ({ ...prev, [key]: fallback }));
        return fallback;
      }
    } catch (error) {
      const fallback = `Unknown ${entityType}`;
      setEntityNames(prev => ({ ...prev, [key]: fallback }));
      return fallback;
    } finally {
      // Remove from loading set
      setLoadingEntities(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  }, [entityNames]);

  // Render Criteria List View
  const renderCriteriaList = () => {
    const criteria = warningCriteria();
    
    if (criteria.length === 0) {
      return (
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">No active warnings</p>
          <p className="text-sm text-muted-foreground">All systems are running smoothly</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {criteria.map((criteria) => {
          const colors = getSeverityColors(criteria.severity);
          return (
            <Card 
              key={criteria.configurationId}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                colors.border,
                colors.hover
              )}
              onClick={() => handleCriteriaClick(criteria)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                      {getSeverityIcon(criteria.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{criteria.name}</h4>
                        <Badge 
                          variant="secondary" 
                          className={cn("text-xs", colors.badge)}
                        >
                          {criteria.severity}
                        </Badge>
                      </div>
                      {criteria.description && (
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {criteria.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-sm font-medium">
                      {criteria.count} {criteria.count === 1 ? 'record' : 'records'}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // Effect to fetch entity names when selectedCriteria changes
  useEffect(() => {
    if (!selectedCriteria) return;

    const records = selectedCriteria.warnings;
    records.forEach(warning => {
      const key = `${warning.entityType}-${warning.entityId}`;
      if (!entityNames[key] && !loadingEntities.has(key)) {
        fetchEntityName(warning.entityType, warning.entityId);
      }
    });
  }, [selectedCriteria, entityNames, loadingEntities, fetchEntityName]);

  // Render Records List View
  const renderRecordsList = () => {
    if (!selectedCriteria) return null;

    const records: WarningRecord[] = selectedCriteria.warnings.map(warning => ({
      id: warning.id,
      entityType: warning.entityType,
      entityId: warning.entityId,
      entityName: entityNames[`${warning.entityType}-${warning.entityId}`] || `Loading...`,
      field: warning.field,
      currentValue: warning.currentValue,
      expectedValue: warning.expectedValue,
      message: warning.message,
      severity: warning.severity,
      createdAt: warning.createdAt
    }));

    // Pagination logic
    const totalPages = Math.ceil(records.length / recordsPerPage);
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const paginatedRecords = records.slice(startIndex, endIndex);

    return (
      <div className="space-y-4">
        <div className="border rounded-lg">
                     <Table>
             <TableHeader>
               <TableRow>
                 <TableHead className="w-[300px]">Entity</TableHead>
                 <TableHead className="w-[150px]">Type</TableHead>
                 <TableHead className="w-[50px]">Actions</TableHead>
               </TableRow>
             </TableHeader>
            <TableBody>
              {paginatedRecords.map((record) => {
                const colors = getSeverityColors(record.severity);
                return (
                  <TableRow 
                    key={record.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRecordClick(record)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded bg-muted">
                          {getEntityIcon(record.entityType)}
                        </div>
                        <span className="truncate max-w-[150px]" title={record.entityName}>
                          {loadingEntities.has(`${record.entityType}-${record.entityId}`) ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                              <span className="text-muted-foreground">Loading...</span>
                            </div>
                          ) : (
                            record.entityName
                          )}
                        </span>
                      </div>
                    </TableCell>
                                         <TableCell className="capitalize text-muted-foreground">
                       {record.entityType}
                     </TableCell>
                     <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRecordClick(record);
                          }}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewEntity(record.entityType, record.entityId);
                          }}
                          title="View Entity"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {records.length > 0 && (
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{startIndex + 1}</span> to{" "}
                <span className="font-medium text-foreground">{Math.min(endIndex, records.length)}</span> of{" "}
                <span className="font-medium text-foreground">{records.length}</span> records
              </div>
            
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show:</span>
                <select
                  value={recordsPerPage}
                  onChange={(e) => {
                    setRecordsPerPage(Number(e.target.value));
                    setCurrentPage(1); // Reset to first page when changing page size
                  }}
                  className="h-8 px-2 py-1 text-sm border rounded-md bg-background"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-muted-foreground">per page</span>
              </div>
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {/* First Page */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  title="First page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <ChevronLeft className="h-4 w-4 -ml-2" />
                </Button>
                
                {/* Previous Page */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  title="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {/* Page Numbers */}
                <div className="flex items-center gap-1 mx-2">
                  {(() => {
                    const pages = [];
                    const maxVisiblePages = 5;
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                    
                    // Adjust start page if we're near the end
                    if (endPage - startPage < maxVisiblePages - 1) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1);
                    }
                    
                    // Add first page and ellipsis if needed
                    if (startPage > 1) {
                      pages.push(
                        <Button
                          key={1}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handlePageChange(1)}
                        >
                          1
                        </Button>
                      );
                      if (startPage > 2) {
                        pages.push(
                          <span key="ellipsis1" className="px-2 text-muted-foreground">
                            ...
                          </span>
                        );
                      }
                    }
                    
                    // Add visible pages
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <Button
                          key={i}
                          variant={currentPage === i ? "default" : "outline"}
                          size="sm"
                          className="h-8 w-8 p-0 font-medium"
                          onClick={() => handlePageChange(i)}
                        >
                          {i}
                        </Button>
                      );
                    }
                    
                    // Add last page and ellipsis if needed
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push(
                          <span key="ellipsis2" className="px-2 text-muted-foreground">
                            ...
                          </span>
                        );
                      }
                      pages.push(
                        <Button
                          key={totalPages}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handlePageChange(totalPages)}
                        >
                          {totalPages}
                        </Button>
                      );
                    }
                    
                    return pages;
                  })()}
                </div>
                
                {/* Next Page */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  title="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                {/* Last Page */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  title="Last page"
                >
                  <ChevronRight className="h-4 w-4" />
                  <ChevronRight className="h-4 w-4 -ml-2" />
                </Button>
                
                {/* Go to page input */}
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm text-muted-foreground">Go to:</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = Number(e.target.value);
                      if (page >= 1 && page <= totalPages) {
                        handleGoToPage(page);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    className="h-8 w-16 px-2 py-1 text-sm border rounded-md bg-background text-center"
                  />
                  <span className="text-sm text-muted-foreground">of {totalPages}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render Record Details View
  const renderRecordDetails = () => {
    if (!selectedRecord) return null;

    const colors = getSeverityColors(selectedRecord.severity);

    return (
      <div className="space-y-4">
        <Card className={cn(colors.border, colors.bg)}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted">
                {getEntityIcon(selectedRecord.entityType)}
              </div>
              <div>
                <CardTitle className="text-lg">
                  {loadingEntities.has(`${selectedRecord.entityType}-${selectedRecord.entityId}`) ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b border-current"></div>
                      <span className="text-muted-foreground">Loading entity...</span>
                    </div>
                  ) : (
                    selectedRecord.entityName
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground capitalize">
                  {selectedRecord.entityType}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Warning Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Field:</span>
                  <span className="font-medium">{selectedRecord.field}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Value:</span>
                  <span className="font-medium">{selectedRecord.currentValue || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected Value:</span>
                  <span className="font-medium">{selectedRecord.expectedValue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">{format(new Date(selectedRecord.createdAt), 'PPP')}</span>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-medium mb-2">Message</h4>
              <p className="text-sm text-muted-foreground">{selectedRecord.message}</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewEntity(selectedRecord.entityType, selectedRecord.entityId)}
                className="flex-1"
                disabled={loadingEntities.has(`${selectedRecord.entityType}-${selectedRecord.entityId}`)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Entity
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/settings/users/${session?.user?.id}/warning-configurations`, '_blank')}
                className="flex-1"
              >
                <Settings className="h-4 w-4 mr-2" />
                View Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render content (shared between mobile and desktop)
  const renderContent = () => (
    <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  {viewMode === 'criteria' && 'Warning Criteria'}
                  {viewMode === 'records' && selectedCriteria?.name}
                  {viewMode === 'details' && 'Record Details'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {viewMode === 'criteria' && `${warningCriteria().length} active warning criteria`}
                  {viewMode === 'records' && `${selectedCriteria?.count} records with warnings`}
                  {viewMode === 'details' && (
                    selectedRecord ? (
                      loadingEntities.has(`${selectedRecord.entityType}-${selectedRecord.entityId}`) ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                          <span>Loading entity...</span>
                        </div>
                      ) : (
                        selectedRecord.entityName
                      )
                    ) : ''
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshWarnings}
                disabled={isRefreshing}
                title="Clear resolved warnings and check for new ones"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          {viewMode !== 'criteria' && (
            <div className="py-3 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={viewMode === 'details' ? handleBackToRecords : handleBackToCriteria}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {viewMode === 'details' ? 'Back to Records' : 'Back to Criteria'}
              </Button>
            </div>
          )}

          {/* Content */}
          <ScrollArea className="flex-1 py-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading warnings...</p>
              </div>
            ) : (
              <>
                {viewMode === 'criteria' && renderCriteriaList()}
                {viewMode === 'records' && renderRecordsList()}
                {viewMode === 'details' && renderRecordDetails()}
              </>
            )}
          </ScrollArea>
        </div>
  );

  // On mobile, use Dialog (modal) instead of Sheet (drawer)
  if (isMobile) {
    return (
      <>
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent 
            className="fixed bottom-0 left-1/2 top-auto translate-x-[-50%] translate-y-0 w-screen max-w-none h-[90vh] p-0 overflow-hidden rounded-t-3xl rounded-b-none border-0 shadow-2xl flex flex-col"
            dialogId="warning-modal"
          >
            <VisuallyHidden>
              <DialogTitle>Warnings</DialogTitle>
            </VisuallyHidden>
            {renderContent()}
          </DialogContent>
        </Dialog>

        {/* Position Detail Drawer */}
      <PositionDetailDrawer
        isOpen={isPositionDrawerOpen}
        onOpenChange={(open) => {
          setIsPositionDrawerOpen(open);
          if (!open) {
            setSelectedPositionId(null);
          }
        }}
        positionId={selectedPositionId}
      />

      {/* Candidate Detail Modal */}
      {selectedCandidateId && isCandidateModalOpen && (
        <CandidateDetailModal
          candidateId={selectedCandidateId}
          open={isCandidateModalOpen}
          onClose={() => {
            setIsCandidateModalOpen(false);
            setSelectedCandidateId(null);
          }}
        />
      )}
      </>
    );
  }

  // Desktop: Use Sheet (drawer)
  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent 
          className="overflow-y-auto min-w-[600px] max-w-[1200px]"
          style={{ width: '50vw' }}
          sheetId="warning-drawer"
        >
          {renderContent()}
        </SheetContent>
      </Sheet>

      {/* Position Detail Drawer */}
      <PositionDetailDrawer
        isOpen={isPositionDrawerOpen}
        onOpenChange={(open) => {
          setIsPositionDrawerOpen(open);
          if (!open) {
            setSelectedPositionId(null);
          }
        }}
        positionId={selectedPositionId}
      />

      {/* Candidate Detail Modal */}
      {selectedCandidateId && isCandidateModalOpen && (
        <CandidateDetailModal
          candidateId={selectedCandidateId}
          open={isCandidateModalOpen}
          onClose={() => {
            setIsCandidateModalOpen(false);
            setSelectedCandidateId(null);
          }}
        />
      )}
    </>
  );
}

