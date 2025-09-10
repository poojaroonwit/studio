"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, Users, Eye, RefreshCw, Loader2, Calendar, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { PositionDetailDrawer } from '@/components/positions/PositionDetailDrawer';

interface HeadcountData {
  id: string;
  positionId: string;
  positionTitle: string;
  department: string;
  requestDate: string;
  status: 'vacant' | 'filled';
  slaStatus: 'on_track' | 'warning' | 'critical' | 'urgent';
  daysRemaining: number;
  daysOverdue: number;
  gradeName: string;
  gradeColor: string;
  slaDays: number;
  recruiterName?: string;
}

interface PositionHeadcountSummary {
  positionId: string;
  positionTitle: string;
  department: string;
  totalHeadcount: number;
  onTrackCount: number;
  warningCount: number;
  criticalCount: number;
  urgentCount: number;
  headcounts: HeadcountData[];
  recruiterName?: string;
}

interface PositionHeadcountChartProps {
  recruiterId?: string;
  onDataUpdate?: () => void;
}

export function PositionHeadcountChart({ recruiterId, onDataUpdate }: PositionHeadcountChartProps) {
  const { data: session } = useSession();
  const [positionData, setPositionData] = useState<PositionHeadcountSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [isPositionDrawerOpen, setIsPositionDrawerOpen] = useState(false);

  // Determine the actual recruiter ID to use
  const actualRecruiterId = recruiterId === 'current' ? session?.user?.id : recruiterId;

  const fetchHeadcountData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = new URL('/api/headcount/sla-summary', window.location.origin);
      if (actualRecruiterId) {
        url.searchParams.set('recruiterId', actualRecruiterId);
      }
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error('Failed to fetch headcount data');
      }
      
      const data = await response.json();
      setPositionData(data.positions || []);
    } catch (err) {
      console.error('Error fetching headcount data:', err);
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
    fetchHeadcountData();
  }, [actualRecruiterId, session]);

  // Refresh data when dashboard data updates
  useEffect(() => {
    if (onDataUpdate) {
      fetchHeadcountData();
    }
  }, [onDataUpdate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'critical': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'on_track': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'urgent': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'critical': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'warning': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'on_track': return <TrendingUp className="h-4 w-4 text-green-500" />;
      default: return <Users className="h-4 w-4 text-gray-500" />;
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

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Position Headcount Chart
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
            <Users className="h-5 w-5 text-blue-500" />
            Position Headcount Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-red-500 mb-2">Error loading headcount data</p>
            <Button onClick={fetchHeadcountData} variant="outline" size="sm">
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
                <Users className="h-5 w-5 text-blue-500" />
                Position Headcount Chart
                <Badge variant="outline" className="ml-2">
                  {positionData.length} positions
                </Badge>
              </CardTitle>
              <CardDescription>
                {actualRecruiterId ? 'Your positions with headcount breakdown' : 'All positions with headcount breakdown'}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchHeadcountData}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0" style={{ height: 'calc(100% - 100px)' }}>
          <ScrollArea className="h-full px-6 py-4">
            <div className="space-y-4">
              {positionData.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No positions with headcount data found</p>
                </div>
              ) : (
                positionData.map((position) => (
                  <div
                    key={position.positionId}
                    className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                  >
                    {/* Position Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm truncate">
                            {position.positionTitle}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {position.department}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{position.totalHeadcount} total headcount</span>
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
                        className="ml-2 h-6 w-6 p-0"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Headcount Status Summary */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded">
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          {position.onTrackCount}
                        </div>
                        <div className="text-xs text-green-600 dark:text-green-400">On Track</div>
                      </div>
                      <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                        <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                          {position.warningCount}
                        </div>
                        <div className="text-xs text-yellow-600 dark:text-yellow-400">Warning</div>
                      </div>
                      <div className="text-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded">
                        <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                          {position.criticalCount}
                        </div>
                        <div className="text-xs text-orange-600 dark:text-orange-400">Critical</div>
                      </div>
                      <div className="text-center p-2 bg-red-50 dark:bg-red-950/20 rounded">
                        <div className="text-lg font-bold text-red-600 dark:text-red-400">
                          {position.urgentCount}
                        </div>
                        <div className="text-xs text-red-600 dark:text-red-400">Urgent</div>
                      </div>
                    </div>

                    {/* Individual Headcount Details */}
                    <div className="space-y-2">
                      {position.headcounts.map((headcount) => (
                        <div
                          key={headcount.id}
                          className="flex items-center justify-between p-2 bg-muted/20 rounded text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span>{getStatusIcon(headcount.slaStatus)}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {headcount.gradeName}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Requested: {new Date(headcount.requestDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {headcount.slaStatus === 'on_track' ? (
                              <span className="text-green-600 dark:text-green-400 font-medium">
                                {headcount.daysRemaining} days remaining
                              </span>
                            ) : (
                              <span className={cn("font-medium", getStatusColor(headcount.slaStatus))}>
                                {headcount.daysOverdue} days overdue
                              </span>
                            )}
                            <Badge 
                              variant={headcount.slaStatus === 'on_track' ? 'default' : 'destructive'} 
                              className="text-xs"
                            >
                              {getStatusLabel(headcount.slaStatus)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>SLA Compliance</span>
                        <span>
                          {Math.round((position.onTrackCount / position.totalHeadcount) * 100)}%
                        </span>
                      </div>
                      <Progress 
                        value={(position.onTrackCount / position.totalHeadcount) * 100} 
                        className="h-2"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
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
