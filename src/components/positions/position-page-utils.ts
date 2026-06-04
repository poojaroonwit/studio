import type { Position } from '@/lib/types';

export type PositionSortDirection = 'asc' | 'desc' | null;

export function getNextPositionSortState(
  currentColumn: string | null,
  currentDirection: PositionSortDirection,
  nextColumn: string | null,
  requestedDirection?: PositionSortDirection
) {
  if (!nextColumn) {
    return { sortColumn: null, sortDirection: 'asc' as PositionSortDirection };
  }

  if (currentColumn === nextColumn && (requestedDirection === null || requestedDirection === undefined)) {
    if (currentDirection === 'asc') {
      return { sortColumn: nextColumn, sortDirection: 'desc' as PositionSortDirection };
    }

    if (currentDirection === 'desc') {
      return { sortColumn: nextColumn, sortDirection: null };
    }

    return { sortColumn: nextColumn, sortDirection: 'asc' as PositionSortDirection };
  }

  return { sortColumn: nextColumn, sortDirection: requestedDirection || 'desc' };
}

function getSortablePositionValue(position: Position, column: string) {
  switch (column) {
    case 'title':
      return position.title?.toLowerCase() || '';
    case 'department':
      return position.department?.toLowerCase() || '';
    case 'status':
      return position.isOpen ? 'open' : 'closed';
    case 'recruiter':
      return position.recruiterName?.toLowerCase() || '';
    default:
      return '';
  }
}

export function sortPositions(
  positions: Position[],
  sortColumn: string | null,
  sortDirection: PositionSortDirection
) {
  if (!sortColumn || !sortDirection) {
    return positions;
  }

  return [...positions].sort((a, b) => {
    const aValue = getSortablePositionValue(a, sortColumn);
    const bValue = getSortablePositionValue(b, sortColumn);

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
}
