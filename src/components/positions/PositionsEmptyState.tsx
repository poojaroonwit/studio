"use client";

import { Briefcase, PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface PositionsEmptyStateProps {
  message: string;
  showAddFirstPositionButton: boolean;
  onAddPosition: () => void;
}

export function PositionsEmptyState({
  message,
  showAddFirstPositionButton,
  onAddPosition,
}: PositionsEmptyStateProps) {
  return (
    <div className="text-center py-12 empty-state">
      <Briefcase className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No positions found</h3>
      <p className="text-muted-foreground mb-4">{message}</p>
      {showAddFirstPositionButton && (
        <Button onClick={onAddPosition} className="btn-primary-gradient">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add First Position
        </Button>
      )}
    </div>
  );
}
