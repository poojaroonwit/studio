"use client";

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Briefcase, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { PositionDetailDrawer } from '@/components/positions/PositionDetailDrawer';
import { cn } from '@/lib/utils';
import { useUserPreferences } from '@/hooks/use-user-preferences';
 

interface AssignedPosition {
  id: string;
  title: string;
  department: string;
  positionLevel?: string;
  isOpen?: boolean;
  headcount: {
    total: number;
    vacant: number;
    filled: number;
  };
  grade?: {
    name: string;
    color: string;
  };
}

interface AssignedPositionsSidebarProps {
  className?: string;
  variant?: 'default' | 'compact';
}

export function AssignedPositionsSidebar({ className, variant = 'default' }: AssignedPositionsSidebarProps) {
  const { data: session } = useSession();
  const { appearance } = useUserPreferences();
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
            <div className="pointer-events-none absolute left-2 top-0 bottom-0 w-[2px] bg-border/70 rounded-full" />
            <ul className={cn("mt-2 space-y-1 pl-7", variant === 'compact' ? "mt-1" : "") }>
              {positions.slice(0, visibleCount).map((position) => (
                <li
                  key={position.id}
                  className={cn(
                    "relative flex items-center gap-2 py-1 cursor-pointer before:absolute before:left-2 before:top-1/2 before:-translate-y-1/2 before:h-[2px] before:w-5 before:bg-border/70 before:rounded-full",
                    variant === 'compact' ? "text-foreground hover:opacity-80" : "hover:text-foreground"
                  )}
                  onClick={() => handlePositionClick(position.id)}
                  title={position.title}
                >
                  <span
                    className={cn("flex-1 min-w-0 text-sm overflow-hidden text-ellipsis whitespace-nowrap pr-2")}
                    style={{ color: appearance?.personalColor || undefined }}
                  >
                    {position.title}
                  </span>
                  <span className={cn("mx-1 select-none", variant === 'compact' ? "text-foreground/60" : "text-muted-foreground/70")}>...</span>
                  {position.isOpen === false ? null : (
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 text-xs h-5 px-1.5 tabular-nums",
                        variant === 'compact' ? "border-foreground/30" : "border-border"
                      )}
                      style={{
                        borderColor: appearance?.personalColor || undefined,
                        color: appearance?.personalColor || undefined,
                      }}
                    >
                      {position.headcount.filled}/{position.headcount.total}
                    </Badge>
                  )}
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
