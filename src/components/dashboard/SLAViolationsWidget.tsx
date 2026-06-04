"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, Users, Eye, BarChart3, Filter, RefreshCw, Loader2, CheckCircle, Flame, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { PositionDetailDrawer } from '@/components/positions/PositionDetailDrawer';
import type { SLAViolationNotification, SLAPositionData, SLAStatistics, PositionWithoutSLA } from '@/lib/slaNotificationService';

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
  const [positionsWithoutSLA, setPositionsWithoutSLA] = useState<PositionWithoutSLA[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      url.searchParams.set('includeWithoutSLA', 'true');

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error('Failed to fetch SLA data');
      }

      const data = await response.json();
      setViolations(data.violations || []);
      setAllPositions(data.allPositions || []);
      setStatistics(data.statistics || null);
      setHeadcounts(data.headcounts || []);
      setPositionsWithoutSLA(data.positionsWithoutSLA || []);
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
    if (filterSeverity === 'no_sla') return false; // No SLA positions are handled separately
    return position.status === filterSeverity;
  });

  const getCountsForPosition = (positionId: string) => {
    const relevant = headcounts.filter(h => h.positionId === positionId && h.headcountStatus === 'vacant');

    // Filter to show only headcounts that are overdue or within 3 days of being overdue
    const criticalHeadcounts = relevant.filter(h => {
      if (h.isViolated) return true; // Show overdue headcounts
      if (typeof h.daysRemaining === 'number' && h.daysRemaining <= 3) return true; // Show headcounts with 3 days or less remaining
      return false; // Hide headcounts with more than 3 days remaining
    });

    // Group critical headcounts by request date and remaining days
    const groupedByRequestDate: { [key: string]: { count: number; daysRemaining: number | null; isOverdue: boolean } } = {};

    for (const h of criticalHeadcounts) {
      const requestDate = h.requestDate ? new Date(h.requestDate).toISOString().split('T')[0] : 'unknown';
      const key = `${requestDate}_${h.daysRemaining || 'overdue'}`;

      if (!groupedByRequestDate[key]) {
        groupedByRequestDate[key] = {
          count: 0,
          daysRemaining: h.daysRemaining,
          isOverdue: h.isViolated
        };
      }
      groupedByRequestDate[key].count += 1;
    }

    // Convert to array and sort by days remaining (overdue first, then by days remaining)
    const groupedEntries = Object.entries(groupedByRequestDate).map(([key, data]) => ({
      requestDate: key.split('_')[0],
      ...data
    })).sort((a, b) => {
      // Overdue items first
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;

      // Then sort by days remaining (ascending)
      if (a.daysRemaining === null && b.daysRemaining === null) return 0;
      if (a.daysRemaining === null) return 1;
      if (b.daysRemaining === null) return -1;
      return a.daysRemaining - b.daysRemaining;
    });

    return { groupedEntries };
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
                {/* {violations.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {violations.length}
                </Badge>
              )} */}
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


        <CardContent className="flex-1 p-0" style={{ height: 'calc(100% - 120px)' }}>
          <div className="h-full">
            {statistics && (
              <ScrollArea className="h-full px-6 py-4">
                <div className="space-y-4">
                  {/* Compliance Rate */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">SLA Compliance Rate</span>
                      <span className="text-sm text-muted-foreground">{Number(statistics.complianceRate).toFixed(1)}%</span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-md bg-gray-200 dark:bg-gray-700">
                      <div
                        className={`h-full transition-all ${statistics.complianceRate >= 90
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
                  <div className="grid grid-cols-5 gap-3">
                    <div
                      className={`text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 ${filterSeverity === 'on_track' ? 'ring-2 ring-green-500 shadow-lg' : ''
                        }`}
                      onClick={() => setFilterSeverity('on_track')}
                     role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{statistics.onTrack}</div>
                      <div className="text-xs text-green-600 dark:text-green-400">On Track</div>
                    </div>
                    <div
                      className={`text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 ${filterSeverity === 'warning' ? 'ring-2 ring-yellow-500 shadow-lg' : ''
                        }`}
                      onClick={() => setFilterSeverity('warning')}
                     role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}>
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{statistics.warning}</div>
                      <div className="text-xs text-yellow-600 dark:text-yellow-400">Warning</div>
                    </div>
                    <div
                      className={`text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 ${filterSeverity === 'critical' ? 'ring-2 ring-orange-500 shadow-lg' : ''
                        }`}
                      onClick={() => setFilterSeverity('critical')}
                     role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}>
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{statistics.critical}</div>
                      <div className="text-xs text-orange-600 dark:text-orange-400">Critical</div>
                    </div>
                    <div
                      className={`text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 ${filterSeverity === 'urgent' ? 'ring-2 ring-red-500 shadow-lg' : ''
                        }`}
                      onClick={() => setFilterSeverity('urgent')}
                     role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}>
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">{statistics.urgent}</div>
                      <div className="text-xs text-red-600 dark:text-red-400">Urgent</div>
                    </div>
                    <div
                      className={`text-center p-3 bg-gray-50 dark:bg-gray-950/20 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 ${filterSeverity === 'no_sla' ? 'ring-2 ring-gray-500 shadow-lg' : ''
                        }`}
                      onClick={() => setFilterSeverity('no_sla')}
                     role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}>
                      <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{positionsWithoutSLA.length}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">No SLA</div>
                    </div>
                  </div>




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
                            <SelectItem value="no_sla">No SLA</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {filterSeverity === 'no_sla' ? (
                      positionsWithoutSLA.length === 0 ? (
                        <div className="text-center py-4">
                          <Clock className="h-8 w-8 text-green-500 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No positions without SLA found</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {positionsWithoutSLA.slice(0, 5).map((position) => (
                            <div
                              key={position.positionId}
                              className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                                  <h4 className="font-medium text-xs truncate">
                                    {position.positionTitle}
                                  </h4>
                                  <Badge variant="outline" className="text-xs">
                                    No SLA
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{position.department}</span>
                                  {position.recruiterName && (
                                    <>
                                      <span>•</span>
                                      <span>{position.recruiterName}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedPositionId(position.positionId);
                                  setIsPositionDrawerOpen(true);
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          {positionsWithoutSLA.length > 5 && (
                            <div className="text-center pt-2">
                              <Button variant="outline" size="sm" onClick={() => {
                                window.open('/positions', '_blank');
                              }}>
                                View all {positionsWithoutSLA.length} positions without SLA
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    ) : filteredPositions.length === 0 ? (
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
                                <div className="mt-1 text-[11px] text-muted-foreground space-y-1">
                                  {(() => {
                                    const { groupedEntries } = getCountsForPosition(position.positionId);
                                    return (
                                      <>
                                        {groupedEntries.map((group, index) => (
                                          <div key={index} className="flex items-center">
                                            {group.count} headcount{group.count > 1 ? 's' : ''} {
                                              group.isOverdue
                                                ? <span className="text-red-600 dark:text-red-400"> overdue</span>
                                                : ` ${group.daysRemaining} days remain`
                                            }
                                          </div>
                                        ))}
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
