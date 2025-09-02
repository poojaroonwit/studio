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
}

export function AssignedPositionsSidebar({ className }: AssignedPositionsSidebarProps) {
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
      <div className={cn("p-4 text-sm text-muted-foreground text-center", className)}>
        <Briefcase className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
        <p>No assigned positions</p>
      </div>
    );
  }

  return (
    <>
      <div className={cn("space-y-3", className)}>
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

        <ScrollArea className="h-[300px] px-3">
          <ul className="mt-2 space-y-1 pl-3 border-l">
            {positions.slice(0, visibleCount).map((position) => (
              <li
                key={position.id}
                className="flex items-center gap-2 py-1 cursor-pointer hover:text-foreground"
                onClick={() => handlePositionClick(position.id)}
                title={position.title}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                <span className="flex-1 min-w-0 text-sm text-muted-foreground truncate">
                  {position.title}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {position.headcount.filled}/{position.headcount.total}
                </span>
              </li>
            ))}
          </ul>

          {visibleCount < positions.length && (
            <div className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-primary hover:underline"
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
