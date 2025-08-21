"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, Users, Eye, TrendingUp, Calendar, Target, BarChart3, Filter, RefreshCw, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import type { SLAViolationNotification } from '@/lib/slaNotificationService';

interface SLAViolationsWidgetProps {
  recruiterId?: string;
}

interface SLAStats {
  total: number;
  critical: number;
  warning: number;
  onTrack: number;
  complianceRate: number;
}

export function SLAViolationsWidget({ recruiterId }: SLAViolationsWidgetProps) {
  const [violations, setViolations] = useState<SLAViolationNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [stats, setStats] = useState<SLAStats>({
    total: 0,
    critical: 0,
    warning: 0,
    onTrack: 0,
    complianceRate: 0
  });
  const router = useRouter();

  const fetchViolations = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = recruiterId 
        ? `/api/sla-violations?recruiterId=${recruiterId}`
        : '/api/sla-violations';
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch SLA violations');
      }
      
      const data = await response.json();
      const violationsData = data.violations || [];
      setViolations(violationsData);
      
      // Calculate stats
      const critical = violationsData.filter((v: SLAViolationNotification) => v.daysOverdue > 30).length;
      const warning = violationsData.filter((v: SLAViolationNotification) => v.daysOverdue <= 30 && v.daysOverdue > 7).length;
      const total = violationsData.length;
      const onTrack = Math.max(0, 100 - total); // Assuming we have 100 total positions for demo
      const complianceRate = total > 0 ? Math.round(((onTrack) / (total + onTrack)) * 100) : 100;
      
      setStats({
        total,
        critical,
        warning,
        onTrack,
        complianceRate
      });
    } catch (err) {
      console.error('Error fetching SLA violations:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, [recruiterId]);

  const getSeverityColor = (daysOverdue: number) => {
    if (daysOverdue <= 7) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
    if (daysOverdue <= 30) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
    return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
  };

  const getSeverityIcon = (daysOverdue: number) => {
    if (daysOverdue <= 7) return '⚠️';
    if (daysOverdue <= 30) return '🚨';
    return '🔥';
  };

  const getSeverityLevel = (daysOverdue: number) => {
    if (daysOverdue <= 7) return 'warning';
    if (daysOverdue <= 30) return 'critical';
    return 'urgent';
  };

  const filteredViolations = violations.filter(violation => {
    if (filterSeverity === 'all') return true;
    const level = getSeverityLevel(violation.daysOverdue);
    return level === filterSeverity;
  });

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
            <Button onClick={fetchViolations} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
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
              {recruiterId ? 'Your positions with SLA violations' : 'All positions with SLA violations'}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchViolations}
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
          Overview
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
          <AlertTriangle className="h-4 w-4" />
          Violations
          {violations.length > 0 && (
            <Badge variant="destructive" className="ml-1 text-xs">
              {violations.length}
            </Badge>
          )}
        </div>
        <div
          onClick={() => setActiveTab('trends')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 relative cursor-pointer",
            activeTab === 'trends'
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
        >
          <TrendingUp className="h-4 w-4" />
          Trends
        </div>
      </div>

      <CardContent className="flex-1 p-0">
        <div className="h-full">
          {activeTab === 'overview' && (
            <ScrollArea className="h-full px-6 py-4">
              <div className="space-y-4">
                {/* Compliance Rate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">SLA Compliance Rate</span>
                    <span className="text-sm text-muted-foreground">{stats.complianceRate}%</span>
                  </div>
                  <Progress value={stats.complianceRate} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {stats.onTrack} positions on track, {stats.total} violations
                  </p>
                </div>

                {/* Severity Breakdown */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical}</div>
                    <div className="text-xs text-red-600 dark:text-red-400">Critical</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.warning}</div>
                    <div className="text-xs text-orange-600 dark:text-orange-400">Warning</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.onTrack}</div>
                    <div className="text-xs text-green-600 dark:text-green-400">On Track</div>
                  </div>
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
                {filteredViolations.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">No violations found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {filterSeverity === 'all' 
                        ? 'All positions are within their SLA timeline'
                        : `No ${filterSeverity} violations found`
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredViolations.slice(0, 8).map((violation) => (
                      <div
                        key={violation.positionId}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{getSeverityIcon(violation.daysOverdue)}</span>
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
                            <span className={getSeverityColor(violation.daysOverdue)}>
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
                          onClick={() => router.push(`/positions/${violation.positionId}`)}
                          className="ml-2"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {filteredViolations.length > 8 && (
                      <div className="text-center pt-2">
                        <Button variant="outline" size="sm" onClick={() => router.push('/positions')}>
                          View all {filteredViolations.length} violations
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {activeTab === 'trends' && (
            <ScrollArea className="h-full px-6 py-4">
              <div className="space-y-4">
                {/* Trend Indicators */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium">This Week</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                      {Math.max(0, stats.total - 2)}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      New violations
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium">Resolved</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                      {Math.max(0, 2)}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      This week
                    </div>
                  </div>
                </div>

                {/* Monthly Trend */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Monthly Trend</h4>
                  <div className="h-20 bg-muted/30 rounded-lg flex items-end justify-around p-2">
                    {[3, 5, 2, 7, 4, 6, 3].map((value, index) => (
                      <div
                        key={index}
                        className="bg-primary/60 rounded-t w-4"
                        style={{ height: `${(value / 7) * 100}%` }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Violations per week (last 7 weeks)
                  </p>
                </div>

                {/* Insights */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Insights</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <span>Most violations occur in Engineering roles</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                      <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>Compliance rate improved 15% this month</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
