"use client";

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Briefcase, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { PositionDetailDrawer } from '@/components/positions/PositionDetailDrawer';
import { cn } from '@/lib/utils';
 

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

        <ScrollArea className={cn("h-[300px] overflow-x-hidden", variant === 'compact' ? "px-0" : "px-3") }>
          <div className="relative text-foreground">
            {/* CodeHim-like tree: vertical branches via li:before and elbows via node:after */}
            <ul className={cn("ap-tree mt-2 space-y-1 pl-0 relative", variant === 'compact' ? "mt-1" : "") }>
              {positions.slice(0, visibleCount).map((position) => (
                <li
                  key={position.id}
                  className={cn(
                    "ap-item group relative flex items-center gap-2 py-1 cursor-pointer w-full max-w-full pl-4",
                    "hover:opacity-90"
                  )}
                  onClick={() => handlePositionClick(position.id)}
                  title={position.title}
                >
                  <span
                    className={cn(
                      "ap-node relative flex-1 min-w-0 text-sm overflow-hidden text-ellipsis whitespace-nowrap pr-2 text-inherit"
                    )}
                  >
                    {position.title}
                  </span>

                  <div className="ml-1 flex items-center gap-1 shrink-0">
                    <span className="select-none leading-none text-foreground/60">...</span>
                    {position.isOpen === false ? null : (
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 text-xs h-5 px-1.5 tabular-nums border-border text-foreground/80"
                        )}
                      >
                        {position.headcount.filled}/{position.headcount.total}
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </ScrollArea>
      </div>

      <PositionDetailDrawer
        isOpen={isPositionDrawerOpen}
        onOpenChange={setIsPositionDrawerOpen}
        positionId={selectedPositionId}
      />
      <style jsx>{`
        /* Tree core */
        .ap-tree { position: relative; }
        .ap-tree .ap-item { padding-bottom: 0.25rem; }
        .ap-tree .ap-item:last-child { padding-bottom: 0; }
        /* Vertical branch */
        .ap-tree .ap-item:before {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0.75rem; /* aligns with pl-4 */
          border-left: 1px solid hsl(var(--border));
        }
        .ap-tree .ap-item:last-child:before {
          height: 0.9rem; /* stop at last row */
          bottom: auto;
        }
        /* Elbow connector */
        .ap-tree .ap-node:after {
          content: '';
          position: absolute;
          top: 0.5em;
          left: -1.25rem; /* meets the vertical line */
          width: 1rem;
          height: 0.6em;
          border-bottom: 1px solid hsl(var(--border));
          border-left: 1px solid hsl(var(--border));
          border-bottom-left-radius: 0.3rem;
        }
        /* Hover emphasis without breaking theme */
        .ap-tree .ap-item:hover .ap-node { color: hsl(var(--foreground)); }
      `}</style>
    </>
  );
}
