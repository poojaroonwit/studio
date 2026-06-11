import { Edit, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface PositionsBulkActionsBarProps {
  selectedCount: number;
  onUpdateMatchCriteria: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function PositionsBulkActionsBar({
  selectedCount,
  onUpdateMatchCriteria,
  onDelete,
  onClear,
}: PositionsBulkActionsBarProps) {
  if (selectedCount <= 0) return null;

  return (
    <div className="flex items-center gap-3 p-2 bg-muted/30 border-b border-border">
      <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onUpdateMatchCriteria}
        className="h-7 px-2 text-primary hover:bg-primary/10 hover:text-primary"
      >
        <Edit className="h-3 w-3 mr-1" /> Update Match Criteria
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-3 w-3 mr-1" /> Delete
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="h-7 px-2 text-muted-foreground hover:text-foreground"
      >
        Clear
      </Button>
    </div>
  );
}
