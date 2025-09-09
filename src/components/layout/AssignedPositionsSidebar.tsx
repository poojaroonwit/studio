"use client";

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Briefcase, Loader2, RotateCcw } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { PositionDetailDrawer } from '@/components/positions/PositionDetailDrawer';
import { useSharedSSE } from '@/hooks/use-shared-sse';
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
  const refreshTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetchAssignedPositions();
    }
  }, [session?.user?.id, session?.user?.role]);

  // Use shared SSE connection for realtime updates (aligned with candidate page and dashboard)
  const { isConnected: sharedSseConnected, subscribeToEvents } = useSharedSSE();
  
  useEffect(() => {
    setSseConnected(sharedSseConnected);
  }, [sharedSseConnected]);

  useEffect(() => {
    let mounted = true;
    let refreshTimeout: NodeJS.Timeout;
    let lastUpdateTime = 0;
    const MIN_UPDATE_INTERVAL = 1000; // Minimum 1 second between updates
    
    // Only subscribe to events if user is authenticated
    if (!session?.user?.id) {
      return;
    }
    
    // Subscribe to shared SSE events
    const unsubscribe = subscribeToEvents((event) => {
      if (!mounted) return;
      
      if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
        console.log('[AssignedPositionsSidebar] SSE event received via shared connection:', event);
      }
      
      // Handle different event types with improved debouncing and rate limiting
      if (event.type === 'position_update' || event.type === 'dashboard_update') {
        const now = Date.now();
        
        // Rate limit updates to prevent excessive reloading
        if (now - lastUpdateTime < MIN_UPDATE_INTERVAL) {
          if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
            console.log('[AssignedPositionsSidebar] Update rate limited, skipping');
          }
          return;
        }
        
        if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
          console.log('[AssignedPositionsSidebar] Processing update event:', event.type);
        }
        
        // Clear existing timeout and set new one to prevent rapid successive calls
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }
        
        refreshTimeout = setTimeout(() => {
          if (mounted && session?.user?.id) {
            lastUpdateTime = Date.now();
            // Only fetch if not currently loading
            if (!isLoading) {
              fetchAssignedPositions();
            }
          }
        }, 1000); // 1 second debounce for better performance
      }
    });
    
    return () => {
      mounted = false;
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      unsubscribe();
    };
  }, [session?.user?.id, isLoading, subscribeToEvents]);

  const fetchAssignedPositions = async () => {
    if (!session?.user?.id) return;
    
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

        <ScrollArea className={cn("max-h-[400px] min-w-0", variant === 'compact' ? "px-0" : "px-3") }>
          <div className="relative min-w-0">
            {/* Common tree pattern: subtle vertical rail + node dots */}
            <ul className={cn("mt-2 space-y-1 pl-0 min-w-0", variant === 'compact' ? "mt-1" : "") }>
              {positions.slice(0, visibleCount).map((position, idx) => (
                <li key={position.id} className="relative">
                  <div
                    className={cn("flex items-stretch gap-1 min-w-0")}
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
                      className="w-full justify-start h-7 pr-1 min-w-0"
                      size="default"
                      onClick={() => handlePositionClick(position.id)}
                      title={position.title}
                    >
                      <span className="flex-1 min-w-0 text-sm overflow-hidden text-ellipsis whitespace-nowrap block">
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
