"use client";

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Briefcase, Loader2, RotateCcw } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { PositionDetailDrawer } from '@/components/positions/PositionDetailDrawer';
import { cn } from '@/lib/utils';
import { SidebarMenuButton } from '@/components/ui/sidebar';
 

interface AssignedPosition {
  id: string;
  title: string;
  department: string;
  positionLevel?: string;
  isOpen?: boolean;
  gradeSlaDays?: number | null;
  headcount: {
    total: number;
    vacant: number;
    filled: number;
  };
  grade?: {
    name: string;
    color: string;
  };
  createdAt?: string;
}

interface AssignedPositionsSidebarProps {
  className?: string;
  variant?: 'default' | 'compact';
}

export function AssignedPositionsSidebar({ className, variant = 'default' }: AssignedPositionsSidebarProps) {
  const { data: session } = useSession();
  const [positions, setPositions] = useState<AssignedPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [isPositionDrawerOpen, setIsPositionDrawerOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [sseConnected, setSseConnected] = useState(false);
  const sseRef = React.useRef<EventSource | null>(null);
  const refreshTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetchAssignedPositions();
    }
  }, [session?.user?.id, session?.user?.role]);

  // Subscribe to SSE position updates and debounce-refresh list
  useEffect(() => {
    if (!session?.user?.id) return;

    const establishSSEConnection = () => {
      try {
        console.log('[AssignedPositionsSidebar] Establishing SSE connection...');
        const es = new EventSource('/api/sse');
        sseRef.current = es;

        es.onopen = () => {
          console.log('[AssignedPositionsSidebar] SSE connection established successfully');
          setSseConnected(true);
          setError(null); // Clear any previous errors
          // Reset retry count on successful connection
          sessionStorage.removeItem('sseRetryCount');
        };

        es.onerror = (error) => {
          console.error('[AssignedPositionsSidebar] SSE connection error:', error);
          setSseConnected(false);
          
          // Enhanced error detection for chunked encoding issues
          const isChunkedError = error.type === 'error' && 
            (es.readyState === EventSource.CLOSED || es.readyState === EventSource.CONNECTING);
          
          // Check for specific network errors that indicate chunked encoding issues
          const isNetworkError = error.type === 'error' && 
            (es.readyState === EventSource.CLOSED || 
             navigator.onLine === false);
          
          let errorMessage = 'SSE connection failed. Please check your authentication and network connection.';
          
          if (isChunkedError || isNetworkError) {
            errorMessage = 'Connection interrupted. Attempting to reconnect...';
            console.log('[AssignedPositionsSidebar] Detected connection interruption, will attempt reconnection');
          }
          
          setError(errorMessage);
          
          // Enhanced reconnection logic with exponential backoff and better error handling
          const retryCount = parseInt(sessionStorage.getItem('sseRetryCount') || '0');
          const maxRetries = 15; // Increased max retries
          const baseDelay = 1000; // 1 second
          const retryDelay = Math.min(baseDelay * Math.pow(1.5, retryCount), 30000); // Max 30 seconds, gentler backoff
          
          if (retryCount < maxRetries) {
            sessionStorage.setItem('sseRetryCount', (retryCount + 1).toString());
            
            // Close existing connection before retrying
            if (sseRef.current) {
              sseRef.current.close();
              sseRef.current = null;
            }
            
            setTimeout(() => {
              console.log(`[AssignedPositionsSidebar] Attempting SSE reconnection (attempt ${retryCount + 1}/${maxRetries})...`);
              establishSSEConnection();
            }, retryDelay);
          } else {
            console.error('[AssignedPositionsSidebar] Max SSE reconnection attempts reached');
            setError('Connection failed - max retries reached. Please refresh the page.');
            sessionStorage.removeItem('sseRetryCount');
            
            // Fallback to polling after max retries
            console.log('[AssignedPositionsSidebar] Falling back to polling mode');
            // You can implement polling fallback here if needed
          }
        };

        const handlePositionUpdate = (event: MessageEvent) => {
          try {
            console.log('[AssignedPositionsSidebar] Received position_update event:', event.data);
            const payload = JSON.parse(event.data || '{}');
            // If event carries a position and it's open or recruiter changed, refresh list
            if (payload && (payload.position || payload.data?.position)) {
              console.log('[AssignedPositionsSidebar] Refreshing due to position update');
              if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
              refreshTimerRef.current = setTimeout(() => {
                fetchAssignedPositions();
              }, 500);
            }
            // Also refresh when position list is updated (includes deletions and headcount changes)
            if (payload && (payload.action === 'list_updated' || payload.action === 'deleted')) {
              console.log('[AssignedPositionsSidebar] Refreshing due to list update:', payload.action);
              if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
              refreshTimerRef.current = setTimeout(() => {
                fetchAssignedPositions();
              }, 500);
            }
          } catch (error) {
            console.error('[AssignedPositionsSidebar] Error parsing position_update event:', error);
          }
        };

        const handleDashboardUpdate = (event: MessageEvent) => {
          try {
            console.log('[AssignedPositionsSidebar] Received dashboard_update event:', event.data);
            const payload = JSON.parse(event.data || '{}');
            // Refresh when dashboard updates occur (includes statistics and headcount changes)
            if (payload && payload.type === 'dashboard_update') {
              console.log('[AssignedPositionsSidebar] Refreshing due to dashboard update');
              if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
              refreshTimerRef.current = setTimeout(() => {
                fetchAssignedPositions();
              }, 500);
            }
          } catch (error) {
            console.error('[AssignedPositionsSidebar] Error parsing dashboard_update event:', error);
          }
        };

        es.addEventListener('position_update', handlePositionUpdate);
        es.addEventListener('dashboard_update', handleDashboardUpdate);
        
        // Add general message listener to catch any events
        es.onmessage = (event) => {
          console.log('[AssignedPositionsSidebar] Received general message:', event.data);
        };

      } catch (error) {
        console.error('[AssignedPositionsSidebar] Failed to establish SSE connection:', error);
        setSseConnected(false);
        setError('Failed to establish real-time connection. Manual refresh still available.');
      }
    };

    // Start the connection
    establishSSEConnection();

    return () => {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [session?.user?.id]);

  const fetchAssignedPositions = async () => {
    if (!session?.user?.id) return;
    
    console.log('[AssignedPositionsSidebar] Fetching assigned positions for user:', session.user.id);
    setIsLoading(true);
    setError(null);
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const response = await fetch(`/api/positions/recruiter-assigned?recruiterId=${session.user.id}` , {
        credentials: 'include',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeout);
      if (!response.ok) {
        let details = '';
        try {
          const txt = await response.text();
          details = txt || '';
        } catch {}
        throw new Error(`Failed to fetch assigned positions (${response.status}) ${details}`.trim());
      }
      
      const data = await response.json();
      console.log('[AssignedPositionsSidebar] Received positions data:', data);
      setPositions(data.data || []);
      setVisibleCount(5);
    } catch (err) {
      setError((err as Error).message);
      console.error('Error fetching assigned positions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePositionClick = (positionId: string) => {
    setSelectedPositionId(positionId);
    setIsPositionDrawerOpen(true);
  };

  if (!session?.user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-4", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("p-4 text-sm text-muted-foreground", className)}>
        <p>Error loading positions: {error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchAssignedPositions}
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className={cn(variant === 'compact' ? "px-0" : "p-4 text-center", className)}>
        {variant !== 'compact' && (
          <>
            <Briefcase className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No assigned positions</p>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={cn(variant === 'compact' ? "space-y-1" : "space-y-3", className)}>
        {variant !== 'compact' && (
          <>
            <div className="flex items-center gap-2 px-3">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Positions</span>
              <div className="ml-auto flex items-center gap-2">
                <div 
                  className={cn(
                    "h-2 w-2 rounded-full",
                    sseConnected ? "bg-green-500" : "bg-yellow-500"
                  )}
                  title={sseConnected ? "Real-time updates active" : "Real-time updates inactive"}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-sidebar-accent"
                  onClick={fetchAssignedPositions}
                  title="Refresh positions"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
                <Badge variant="secondary" className="text-xs">
                  {positions.length}
                </Badge>
              </div>
            </div>
            <div className="px-3">
              <div className="border-t" />
            </div>
          </>
        )}

        <ScrollArea className={cn("h-[300px]", variant === 'compact' ? "px-0" : "px-3") }>
          <div className="relative">
            {/* Common tree pattern: subtle vertical rail + node dots */}
            <ul className={cn("mt-2 space-y-1 pl-0", variant === 'compact' ? "mt-1" : "") }>
              {positions.slice(0, visibleCount).map((position, idx) => (
                <li key={position.id} className="relative">
                  <div
                    className={cn("flex items-stretch gap-1")}
                  >
                    {/* Timeline column (smaller center point + continuous vertical line) */}
                    <div className="relative flex flex-col items-center justify-center w-6 h-7">
                      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-border/70" />
                      <span
                        className={cn(
                          "inline-flex items-center justify-center h-5 min-w-[24px] px-1 rounded border text-[10px] tabular-nums z-10",
                          "backdrop-blur-sm bg-white/50 border-border text-muted-foreground group-hover:text-foreground group-hover:border-foreground/60"
                        )}
                      >
                        {position.headcount.filled}/{position.headcount.total}
                      </span>
                    </div>
 
                    {/* Content row */}
                    <SidebarMenuButton
                      className="w-full justify-start h-7 pr-1"
                      size="default"
                      onClick={() => handlePositionClick(position.id)}
                      title={position.title}
                    >
                      <span className="flex-1 min-w-0 text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                        {position.title}
                      </span>
                      
                      {/* trailing badge removed since it is shown at the timeline node */}
                    </SidebarMenuButton>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {visibleCount < positions.length && (
            <div className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-6 px-2 text-xs text-sidebar-foreground hover:underline")}
                onClick={() => setVisibleCount((c) => Math.min(c + 5, positions.length))}
              >
                Load more
              </Button>
            </div>
          )}
        </ScrollArea>
      </div>

      <PositionDetailDrawer
        isOpen={isPositionDrawerOpen}
        onOpenChange={setIsPositionDrawerOpen}
        positionId={selectedPositionId}
      />
    </>
  );
}
