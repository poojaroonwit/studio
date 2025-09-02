"use client";

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Briefcase, Loader2 } from 'lucide-react';
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
  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    if (session?.user?.id) {
      fetchAssignedPositions();
    }
  }, [session?.user?.id, session?.user?.role]);

  const fetchAssignedPositions = async () => {
    if (!session?.user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/positions/recruiter-assigned?recruiterId=${session.user.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch assigned positions');
      }
      
      const data = await response.json();
      setPositions(data.data || []);
      setVisibleCount(3);
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
              <Badge variant="secondary" className="ml-auto text-xs">
                {positions.length}
              </Badge>
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
                    className={cn("flex items-stretch gap-2")}
                  >
                    {/* Timeline column (smaller center point + continuous vertical line) */}
                    <div className="relative flex flex-col items-center justify-center w-7 h-7">
                      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-border/70" />
                      <span
                        className={cn(
                          "inline-flex items-center justify-center h-5 min-w-[24px] px-1 rounded border text-[10px] tabular-nums z-10",
                          "bg-background border-border text-muted-foreground group-hover:text-foreground group-hover:border-foreground/60"
                        )}
                      >
                        {position.headcount.filled}/{position.headcount.total}
                      </span>
                    </div>
 
                    {/* Content row */}
                    <SidebarMenuButton
                      className="w-full justify-start h-7 pr-2"
                      size="default"
                      onClick={() => handlePositionClick(position.id)}
                      title={position.title}
                    >
                      {/* SLA subtle date (left) */}
                      <span className="mr-2 text-[11px] text-muted-foreground shrink-0">
                        {(() => {
                          try {
                            if (position.gradeSlaDays && position.createdAt) {
                              const base = new Date(position.createdAt);
                              const due = new Date(base.getTime() + position.gradeSlaDays * 24 * 60 * 60 * 1000);
                              const mm = String(due.getMonth() + 1).padStart(2, '0');
                              const dd = String(due.getDate()).padStart(2, '0');
                              return `${mm}/${dd}`;
                            }
                          } catch {}
                          return '';
                        })()}
                      </span>
                      <span className="flex-1 min-w-0 text-sm line-clamp-2 pr-2">
                        {position.title}
                      </span>
                      <span className="mx-1 select-none">...</span>
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
                className={cn("h-6 px-2 text-xs", variant === 'compact' ? "text-foreground/80 hover:underline" : "text-primary hover:underline")}
                onClick={() => setVisibleCount((c) => Math.min(c + 3, positions.length))}
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
