"use client";

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Briefcase, Users, Eye, Loader2 } from 'lucide-react';
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
          <span className="text-sm font-medium text-muted-foreground">My Positions</span>
          <Badge variant="secondary" className="ml-auto text-xs">
            {positions.length}
          </Badge>
        </div>
        
        <ScrollArea className="h-[300px] px-3">
          <div className="space-y-2">
            {positions.map((position) => (
              <Card 
                key={position.id} 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handlePositionClick(position.id)}
              >
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm font-medium leading-tight">
                    {position.title}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{position.department}</span>
                    {position.positionLevel && (
                      <>
                        <span>•</span>
                        <span>{position.positionLevel}</span>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {position.headcount.vacant} vacant
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge 
                        variant="outline" 
                        className="text-xs h-5 px-1.5"
                        style={{
                          borderColor: position.grade?.color || 'hsl(var(--border))',
                          color: position.grade?.color || 'hsl(var(--muted-foreground))'
                        }}
                      >
                        {position.headcount.total}
                      </Badge>
                      <Eye className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
