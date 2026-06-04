import { describe, expect, it } from 'vitest';
import type { Position } from '@/lib/types';
import { getNextPositionSortState, sortPositions } from './position-page-utils';

function makePosition(overrides: Partial<Position>): Position {
  return {
    id: overrides.id || 'position-id',
    title: overrides.title || '',
    department: overrides.department || '',
    isOpen: overrides.isOpen ?? true,
    recruiterName: overrides.recruiterName,
  } as Position;
}

describe('position page utilities', () => {
  it('cycles a repeated column through desc and unsorted', () => {
    expect(getNextPositionSortState('title', 'asc', 'title')).toEqual({
      sortColumn: 'title',
      sortDirection: 'desc',
    });

    expect(getNextPositionSortState('title', 'desc', 'title')).toEqual({
      sortColumn: 'title',
      sortDirection: null,
    });
  });

  it('sorts positions by visible table fields', () => {
    const positions = [
      makePosition({ id: '2', title: 'Backend Engineer', isOpen: false }),
      makePosition({ id: '1', title: 'Analytics Lead', isOpen: true }),
    ];

    expect(sortPositions(positions, 'title', 'asc').map(position => position.id)).toEqual(['1', '2']);
    expect(sortPositions(positions, 'status', 'asc').map(position => position.id)).toEqual(['2', '1']);
  });
});
