"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, Users, Eye, BarChart3, Filter, RefreshCw, Loader2, CheckCircle, AlertCircle, Flame, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { PositionDetailDrawer } from '@/components/positions/PositionDetailDrawer';
import type { SLAViolationNotification, SLAPositionData, SLAStatistics } from '@/lib/slaNotificationService';

interface SLAViolationsWidgetProps {
  recruiterId?: string;
  onDataUpdate?: () => void;
}

export function SLAViolationsWidget({ recruiterId, onDataUpdate }: SLAViolationsWidgetProps) {
  const { data: session } = useSession();
  const [violations, setViolations] = useState<SLAViolationNotification[]>([]);
  const [allPositions, setAllPositions] = useState<SLAPositionData[]>([]);
  const [statistics, setStatistics] = useState<SLAStatistics | null>(null);
  const [headcounts, setHeadcounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [isPositionDrawerOpen, setIsPositionDrawerOpen] = useState(false);

  // Determine the actual recruiter ID to use
  const actualRecruiterId = recruiterId === 'current' ? session?.user?.id : recruiterId;

  const fetchSLAData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = new URL('/api/sla-violations', window.location.origin);
      if (actualRecruiterId) {
        url.searchParams.set('recruiterId', actualRecruiterId);
      }
      url.searchParams.set('includeAll', 'true');
      url.searchParams.set('includeStats', 'true');
      url.searchParams.set('includeHeadcounts', 'true');
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error('Failed to fetch SLA data');
      }
      
      const data = await response.json();
      setViolations(data.violations || []);
      setAllPositions(data.allPositions || []);
      setStatistics(data.statistics || null);
      setHeadcounts(data.headcounts || []);
    } catch (err) {
      console.error('Error fetching SLA data:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (recruiterId === 'current' && !session?.user?.id) {
      // Wait for session to load
      return;
    }
    fetchSLAData();
  }, [actualRecruiterId, session]);

  // Refresh SLA data when dashboard data updates
  useEffect(() => {
    if (onDataUpdate) {
      fetchSLAData();
    }
  }, [onDataUpdate]);

  const getSeverityColor = (status: string) => {
    switch (status) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'critical': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'on_track': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getSeverityIcon = (status: string) => {
    switch (status) {
      case 'urgent': return <Flame className="h-4 w-4 text-red-500" />;
      case 'critical': return <Bell className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'on_track': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <BarChart3 className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'urgent': return 'Urgent';
      case 'critical': return 'Critical';
      case 'warning': return 'Warning';
      case 'on_track': return 'On Track';
      default: return 'Unknown';
    }
  };

  const filteredPositions = allPositions.filter(position => {
    if (filterSeverity === 'all') return true;
    return position.status === filterSeverity;
  });

  const getCountsForPosition = (positionId: string) => {
    const relevant = headcounts.filter(h => h.positionId === positionId && h.headcountStatus === 'vacant');
    let remaining = 0;
    let overdue = 0;
    let remainingDaysList: number[] = [];
    for (const h of relevant) {
      if (h.isViolated) overdue += 1;
      else if (typeof h.daysRemaining === 'number' && h.daysRemaining >= 0) {
        remaining += 1;
        remainingDaysList.push(h.daysRemaining);
      }
    }
    return { remaining, overdue, remainingDaysList };
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            SLA Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            SLA Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-red-500 mb-2">Error loading SLA data</p>
            <Button onClick={fetchSLAData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full flex flex-col" style={{ height: '100%' }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              SLA Monitoring
              {violations.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {violations.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {actualRecruiterId ? 'Your positions with SLA monitoring' : 'All positions with SLA monitoring'}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSLAData}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Tab Navigation */}
      <div className="flex w-full border-b border-border/50 px-6">
        <div
          onClick={() => setActiveTab('overview')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 relative cursor-pointer",
            activeTab === 'overview'
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
        >
          <BarChart3 className="h-4 w-4" />
          Overview & Positions
          <Badge variant="outline" className="ml-1 text-xs">
            {allPositions.length}
          </Badge>
        </div>
        <div
          onClick={() => setActiveTab('violations')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 relative cursor-pointer",
            activeTab === 'violations'
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
        >
          <AlertCircle className="h-4 w-4" />
          Violations
          {violations.length > 0 && (
            <Badge variant="destructive" className="ml-1 text-xs">
              {violations.length}
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="flex-1 p-0" style={{ height: 'calc(100% - 120px)' }}>
        <div className="h-full">
          {activeTab === 'overview' && statistics && (
            <ScrollArea className="h-full px-6 py-4">
              <div className="space-y-4">
                {/* Compliance Rate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">SLA Compliance Rate</span>
                    <span className="text-sm text-muted-foreground">{statistics.complianceRate}%</span>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-md bg-gray-200 dark:bg-gray-700">
                    <div 
                      className={`h-full transition-all ${
                        statistics.complianceRate >= 90 
                          ? 'bg-green-500' 
                          : statistics.complianceRate >= 70 
                          ? 'bg-yellow-500' 
                          : statistics.complianceRate >= 50 
                          ? 'bg-orange-500' 
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${statistics.complianceRate}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {statistics.onTrack} positions on track, {statistics.total - statistics.onTrack} violations
                  </p>
                </div>

                {/* Severity Breakdown */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{statistics.onTrack}</div>
                    <div className="text-xs text-green-600 dark:text-green-400">On Track</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{statistics.warning}</div>
                    <div className="text-xs text-yellow-600 dark:text-yellow-400">Warning</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{statistics.critical}</div>
                    <div className="text-xs text-orange-600 dark:text-orange-400">Critical</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{statistics.urgent}</div>
                    <div className="text-xs text-red-600 dark:text-red-400">Urgent</div>
                  </div>
                </div>

                {/* Additional Stats */}
                {statistics.averageDaysOverdue > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Overdue Statistics</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-2 bg-muted/30 rounded">
                        <div className="font-medium">{statistics.averageDaysOverdue}</div>
                        <div className="text-xs text-muted-foreground">Avg Days Overdue</div>
                      </div>
                      <div className="p-2 bg-muted/30 rounded">
                        <div className="font-medium">{statistics.totalDaysOverdue}</div>
                        <div className="text-xs text-muted-foreground">Total Days Overdue</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Grade Breakdown */}
                {Object.keys(statistics.byGrade).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">By Grade</h4>
                    <div className="space-y-2">
                      {Object.entries(statistics.byGrade).map(([gradeName, gradeStats]) => (
                        <div key={gradeName} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <span className="text-sm">{gradeName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {gradeStats.violations}/{gradeStats.total}
                            </span>
                            <Badge variant={gradeStats.complianceRate >= 80 ? "default" : "destructive"} className="text-xs">
                              {gradeStats.complianceRate}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Positions List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">All Positions</h4>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="on_track">On Track</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {filteredPositions.length === 0 ? (
                    <div className="text-center py-4">
                      <Clock className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No positions found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredPositions.slice(0, 5).map((position) => (
                        <div
                          key={position.positionId}
                          className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm">{getSeverityIcon(position.status)}</span>
                              <h4 className="font-medium text-xs truncate">
                                {position.positionTitle}
                              </h4>
                              <Badge 
                                variant={position.status === 'on_track' ? 'default' : 'destructive'} 
                                className="text-xs"
                              >
                                {getStatusLabel(position.status)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {position.gradeName}
                              </Badge>
                              {position.isViolated && (
                                <>
                                  <span>•</span>
                                  <span className={getSeverityColor(position.status)}>
                                    {position.daysOverdue} days overdue
                                  </span>
                                </>
                              )}
                            </div>
                            {/* Headcount grouping summary */}
                            {headcounts.length > 0 && (
                              <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-3 flex-wrap">
                                {(() => {
                                  const { remaining, overdue, remainingDaysList } = getCountsForPosition(position.positionId);
                                  return (
                                    <>
                                      {remaining > 0 && (
                                        <>
                                          <span>
                                            {remaining} headcount{remaining > 1 ? 's' : ''} {remainingDaysList.length > 0 ? `${remainingDaysList.join(', ')} days remaining` : 'remaining'}
                                          </span>
                                          {overdue > 0 && <span>•</span>}
                                        </>
                                      )}
                                      {overdue > 0 && (
                                        <span className="text-red-600 dark:text-red-400">
                                          {overdue} headcount{overdue > 1 ? 's' : ''} overdue
                                        </span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPositionId(position.positionId);
                              setIsPositionDrawerOpen(true);
                            }}
                            className="ml-2 h-6 w-6 p-0"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      
                      {filteredPositions.length > 5 && (
                        <div className="text-center pt-2">
                          <Button variant="outline" size="sm" onClick={() => {
                            window.open('/positions', '_blank');
                          }}>
                            View all {filteredPositions.length} positions
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}



          {activeTab === 'violations' && (
            <ScrollArea className="h-full px-6 py-4">
              <div className="space-y-4">
                {/* Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Violations List */}
                {violations.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">No violations found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      All positions are within their SLA timeline
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {violations.slice(0, 8).map((violation) => {
                      const position = allPositions.find(p => p.positionId === violation.positionId);
                      const status = position?.status || 'critical';
                      
                      return (
                        <div
                          key={violation.positionId}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{getSeverityIcon(status)}</span>
                              <h4 className="font-medium text-sm truncate">
                                {violation.positionTitle}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {violation.gradeName}
                              </Badge>
                              <span>•</span>
                              <span>{violation.slaDays} days SLA</span>
                              <span>•</span>
                              <span className={getSeverityColor(status)}>
                                {violation.daysOverdue} days overdue
                              </span>
                            </div>
                            {violation.recruiterName && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <Users className="h-3 w-3" />
                                <span>{violation.recruiterName}</span>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPositionId(violation.positionId);
                              setIsPositionDrawerOpen(true);
                            }}
                            className="ml-2"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                    
                    {violations.length > 8 && (
                      <div className="text-center pt-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          // For "View all violations", we'll open the positions page in a new tab
                          window.open('/positions', '_blank');
                        }}>
                          View all {violations.length} violations
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Trends tab removed */}
        </div>
      </CardContent>
    </Card>

    {/* Position Detail Drawer */}
    <PositionDetailDrawer
      isOpen={isPositionDrawerOpen}
      onOpenChange={setIsPositionDrawerOpen}
      positionId={selectedPositionId}
    />
    </>
  );
}
