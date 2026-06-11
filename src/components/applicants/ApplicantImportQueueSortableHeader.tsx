"use client";

import type { ReactNode } from 'react';
import {
  ChevronDownIcon as ChevronDown,
  ChevronUpIcon as ChevronUp,
  EllipsisVerticalIcon as MoreVertical,
} from '@heroicons/react/24/outline';
import { TableHead } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ApplicantImportQueueSortableHeaderProps {
  field: string;
  children: ReactNode;
  sortField: string;
  sortDirection: 'asc' | 'desc' | null;
  openMenu: string | null;
  onSort: (column: string | null, direction?: 'asc' | 'desc' | null) => void;
  onMenuClick: (menu: string) => void;
  onMenuClose: () => void;
  onOpenChange: (menu: string) => (open: boolean) => void;
}

export function ApplicantImportQueueSortableHeader({
  field,
  children,
  sortField,
  sortDirection,
  openMenu,
  onSort,
  onMenuClick,
  onMenuClose,
  onOpenChange,
}: ApplicantImportQueueSortableHeaderProps) {
  const isActive = sortField === field;

  return (
    <TableHead
      className="font-medium cursor-pointer hover:bg-muted/50 transition-colors select-none group"
      onClick={() => {
        onSort(field);
        onMenuClose();
      }}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <DropdownMenu open={openMenu === field} onOpenChange={onOpenChange(field)}>
          <DropdownMenuTrigger asChild>
            {isActive ? (
              <button
                type="button"
                className="text-primary font-bold p-1 rounded hover:bg-muted h-auto w-auto"
                onClick={(event) => {
                  event.stopPropagation();
                  onMenuClick(field);
                }}
                aria-label="Sort options"
              >
                {sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : sortDirection === 'desc' ? <ChevronDown className="h-4 w-4" /> : <MoreVertical className="h-4 w-4" />}
              </button>
            ) : (
              <button
                type="button"
                className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted h-auto w-auto"
                onClick={(event) => {
                  event.stopPropagation();
                  onMenuClick(field);
                }}
                aria-label="Sort options"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { onSort(field, 'asc'); onMenuClose(); }}>Sort Ascending</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onSort(field, 'desc'); onMenuClose(); }}>Sort Descending</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { onSort(null, null); onMenuClose(); }}>Clear Sort</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </span>
    </TableHead>
  );
}
