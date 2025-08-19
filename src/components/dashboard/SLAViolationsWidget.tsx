"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, Users, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { SLAViolationNotification } from '@/lib/slaNotificationService';

interface SLAViolationsWidgetProps {
  recruiterId?: string;
}

export function SLAViolationsWidget({ recruiterId }: SLAViolationsWidgetProps) {
  const [violations, setViolations] = useState<SLAViolationNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      setViolations(data.violations || []);
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            SLA Violations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            SLA Violations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-red-500 mb-2">Error loading SLA violations</p>
            <Button onClick={fetchViolations} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          SLA Violations
          {violations.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {violations.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {recruiterId ? 'Your positions with SLA violations' : 'All positions with SLA violations'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {violations.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-muted-foreground">No SLA violations found</p>
            <p className="text-sm text-muted-foreground mt-1">All positions are within their SLA timeline</p>
          </div>
        ) : (
          <div className="space-y-3">
            {violations.slice(0, 5).map((violation) => (
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
            
            {violations.length > 5 && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm" onClick={() => router.push('/positions')}>
                  View all {violations.length} violations
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
