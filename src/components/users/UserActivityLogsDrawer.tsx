"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Calendar, Server, ListOrdered } from 'lucide-react';
import { format } from 'date-fns';
import parseISO from 'date-fns/parseISO';
import type { LogEntry, LogLevel, UserProfile } from '@/lib/types';
import { toast } from 'react-hot-toast';

interface UserActivityLogsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
}

const getLogLevelBadgeVariant = (level: LogLevel): "default" | "secondary" | "destructive" | "outline" => {
  switch (level) {
    case 'ERROR': return 'destructive';
    case 'WARN': return 'secondary';
    case 'AUDIT': return 'default';
    case 'INFO': return 'outline';
    case 'DEBUG': return 'outline';
    default: return 'outline';
  }
};

const ITEMS_PER_PAGE = 20;

export function UserActivityLogsDrawer({ isOpen, onClose, user }: UserActivityLogsDrawerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLogs = useCallback(async (page: number = 1) => {
    if (!user?.id || !isOpen) return;

    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        actingUserId: user.id,
      });

      const response = await fetch(`/api/logs?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();
      setLogs(data.data || []);
      setTotalLogs(data.pagination?.total || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching user activity logs:', error);
      toast.error('Failed to load activity logs');
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isOpen]);

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchLogs(1);
    } else {
      setLogs([]);
      setCurrentPage(1);
      setTotalLogs(0);
    }
  }, [isOpen, user?.id, fetchLogs]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchLogs(currentPage).finally(() => setIsRefreshing(false));
  }, [fetchLogs, currentPage]);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      fetchLogs(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    const totalPages = Math.ceil(totalLogs / ITEMS_PER_PAGE);
    if (currentPage < totalPages) {
      fetchLogs(currentPage + 1);
    }
  };

  const totalPages = Math.ceil(totalLogs / ITEMS_PER_PAGE);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[50vw] min-w-[600px] max-w-none p-0" sheetId="user-activity-logs-drawer">
        <div className="h-full flex flex-col">
          <SheetHeader className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="flex items-center gap-2">
                  <ListOrdered className="h-5 w-5" />
                  Activity Logs
                </SheetTitle>
                <SheetDescription className="mt-1">
                  {user ? `Activity logs for ${user.name}` : 'Loading...'}
                </SheetDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-hidden">
            {isLoading && logs.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <ListOrdered className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No activity logs found for this user.</p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-6 space-y-4">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={getLogLevelBadgeVariant(log.level)}>
                            {log.level}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {(() => {
                              try {
                                const dateStr = log.timestamp || log.createdAt;
                                if (!dateStr) return 'Unknown';
                                const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
                                return format(date, 'MMM dd, yyyy HH:mm:ss');
                              } catch {
                                return 'Invalid date';
                              }
                            })()}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">{log.message}</p>
                        {log.source && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Server className="h-3 w-3" />
                            <span>{log.source}</span>
                          </div>
                        )}
                        {log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0 && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
                            <pre>{JSON.stringify(log.details, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({totalLogs} total logs)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1 || isLoading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages || isLoading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

