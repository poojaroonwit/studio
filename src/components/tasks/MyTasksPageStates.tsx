import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MyTasksFilters } from '@/components/tasks/my-tasks-page-utils';

interface MyTasksLoadingStateProps {
  message: string;
}

interface MyTasksEmptyStateProps {
  filters: MyTasksFilters;
  onClearFilters: () => void;
}

export function MyTasksLoadingState({ message }: MyTasksLoadingStateProps) {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-muted-foreground text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
}

export function MyTasksMobileUnavailableState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-10 text-center">
      <h1 className="mb-2 text-lg font-semibold">My Tasks is not available on mobile yet</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Please use the desktop version to manage your task board.
      </p>
    </div>
  );
}

export function MyTasksEmptyState({ filters, onClearFilters }: MyTasksEmptyStateProps) {
  const hasFilters = Object.keys(filters).length > 0;

  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="w-16 h-16 flex items-center justify-center">
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-foreground">No applicants found</h3>
          <p className="text-muted-foreground text-sm">
            {hasFilters
              ? 'Try adjusting your filters to see more results.'
              : 'No applicants are currently assigned to you.'
            }
          </p>
        </div>
        {hasFilters && (
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="mt-2"
          >
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}
