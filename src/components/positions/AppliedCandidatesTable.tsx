"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Eye, ChevronUp, ChevronDown, MoreVertical, Pin as PinIcon, Ban, FileText } from 'lucide-react';
import { StatusBadge } from '@/components/candidates/CandidateKanbanView';
import { ScoreBadge } from '@/components/ui/score-color';
import { formatScoreWithGrade } from '@/lib/scoreUtils';
import { BlacklistBadge } from '@/components/candidates/BlacklistBadge';
import type { Candidate } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AppliedCandidatesTableProps {
  candidates: Candidate[];
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  openMenu: string | null;
  stageNames: Record<string, string>;
  onSort: (column: string | null, direction?: 'asc' | 'desc' | null) => void;
  onOpenMenuChange: (menu: string | null) => void;
  onCandidateClick: (candidateId: string) => void;
  onPinToggle: (candidate: Candidate) => Promise<void>;
  visibleColumns?: Record<string, boolean>;
}

export function AppliedCandidatesTable({
  candidates,
  sortColumn,
  sortDirection,
  openMenu,
  stageNames,
  onSort,
  onOpenMenuChange,
  onCandidateClick,
  onPinToggle,
  visibleColumns = {
    name: true,
    fitScore: true,
    expectedSalary: true,
    status: true,
    applicationDate: true,
    actions: true,
  },
}: AppliedCandidatesTableProps) {
  if (candidates.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No Applied Candidates</h3>
        <p className="text-muted-foreground">No candidates have applied to this position yet.</p>
      </div>
    );
  }

  let rowNumber = 1;
  const pinned = candidates.filter(c => c.isPinned);
  const unpinned = candidates.filter(c => !c.isPinned);

  const SortableHeader = ({ column, label }: { column: string; label: string }) => (
    <TableHead className="cursor-pointer select-none group" onClick={() => onSort(column)}>
      <span className="inline-flex items-center gap-1">
        {label}
        <DropdownMenu open={openMenu === column} onOpenChange={open => onOpenMenuChange(open ? column : null)}>
          <DropdownMenuTrigger asChild>
            {sortColumn === column ? (
              <button
                type="button"
                className="text-primary font-bold p-1 rounded hover:bg-muted"
                onClick={e => { e.stopPropagation(); onOpenMenuChange(column); }}
                aria-label="Sort options"
              >
                {sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            ) : (
              <button
                type="button"
                className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted"
                onClick={e => { e.stopPropagation(); onOpenMenuChange(column); }}
                aria-label="Sort options"
              >
                <MoreVertical size={16} />
              </button>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { onSort(column, 'asc'); onOpenMenuChange(null); }}>Sort Ascending ▲</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onSort(column, 'desc'); onOpenMenuChange(null); }}>Sort Descending ▼</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { onSort(null, null); onOpenMenuChange(null); }}>Clear Sort</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </span>
    </TableHead>
  );

  return (
    <Table containerClassName="overflow-visible">
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          {visibleColumns.name && <SortableHeader column="name" label="Candidate" />}
          {visibleColumns.fitScore && <SortableHeader column="fitScore" label="Fit Score" />}
          {visibleColumns.expectedSalary && <SortableHeader column="expectedSalary" label="Exp. Salary" />}
          {visibleColumns.status && <SortableHeader column="status" label="Status" />}
          {visibleColumns.applicationDate && <SortableHeader column="applicationDate" label="Applied Date" />}
          {visibleColumns.actions && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {pinned.length > 0 && (
          <TableRow className="bg-primary/15 dark:bg-primary/25 border-b-2 border-primary/30">
            <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="py-2 px-3">
              <div className="flex items-center gap-2">
                <PinIcon className="h-4 w-4 text-primary fill-current rotate-45" />
                <span className="font-semibold text-primary">Pinned Candidates</span>
                <span className="text-xs text-muted-foreground">({pinned.length})</span>
              </div>
            </TableCell>
          </TableRow>
        )}
        {pinned.map((candidate) => (
          <TableRow key={candidate.id} className="bg-blue-500/20">
            <TableCell>{rowNumber++}</TableCell>
            <TableCell>
              <div>
                <div
                  className={cn(
                    "font-medium cursor-pointer hover:text-primary hover:underline flex items-center gap-2",
                    candidate.isBlacklisted && "text-destructive"
                  )}
                  onClick={() => onCandidateClick(candidate.id)}
                >
                  {candidate.name}
                  {candidate.isBlacklisted && <Ban className="h-3 w-3" />}
                </div>
                <div className="text-xs text-muted-foreground">{candidate.email}</div>
              </div>
            </TableCell>
            <TableCell>
              {candidate.fitScore !== undefined && candidate.fitScore !== null ? (
                <ScoreBadge score={candidate.fitScore}>
                  {formatScoreWithGrade(candidate.fitScore)}
                </ScoreBadge>
              ) : (
                <Badge variant="outline">No Score</Badge>
              )}
            </TableCell>
            <TableCell>
              {candidate.expectedSalary ? (
                <span className="text-sm font-medium">฿{candidate.expectedSalary.toLocaleString()}</span>
              ) : (
                <span className="text-xs text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell>
              {candidate.isBlacklisted ? (
                <BlacklistBadge />
              ) : (
                <StatusBadge statusId={candidate.statusId} stageNames={stageNames} />
              )}
            </TableCell>
            <TableCell>
              {candidate.applicationDate ? (
                <div className="text-sm">
                  {new Date(candidate.applicationDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">N/A</span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCandidateClick(candidate.id)}
                    className="hover:bg-primary/10"
                  >
                    <Eye className="h-4 w-4" />
                    <span className="ml-1 text-xs">View</span>
                  </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await onPinToggle(candidate);
                  }}
                  title={candidate.isPinned ? 'Unpin' : 'Pin'}
                  className="hover:bg-primary/10"
                >
                  {candidate.isPinned ? (
                    <PinIcon className="h-4 w-4 text-primary fill-current rotate-45" />
                  ) : (
                    <PinIcon className="h-4 w-4 text-black rotate-45" />
                  )}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {unpinned.length > 0 && (
          <TableRow className="bg-muted/30 border-b border-muted">
            <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="py-2 px-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">All Candidates</span>
                <span className="text-xs text-muted-foreground">({unpinned.length})</span>
              </div>
            </TableCell>
          </TableRow>
        )}
        {unpinned.map((candidate) => (
          <TableRow key={candidate.id}>
            <TableCell>{rowNumber++}</TableCell>
            {visibleColumns.name && (
              <TableCell>
                <div>
                  <div
                    className={cn(
                      "font-medium cursor-pointer hover:text-primary hover:underline flex items-center gap-2",
                      candidate.isBlacklisted && "text-destructive"
                    )}
                    onClick={() => onCandidateClick(candidate.id)}
                  >
                    {candidate.name}
                    {candidate.isBlacklisted && <Ban className="h-3 w-3" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{candidate.email}</div>
                </div>
              </TableCell>
            )}
            {visibleColumns.fitScore && (
              <TableCell>
                {candidate.fitScore !== undefined && candidate.fitScore !== null ? (
                  <ScoreBadge score={candidate.fitScore}>
                    {formatScoreWithGrade(candidate.fitScore)}
                  </ScoreBadge>
                ) : (
                  <Badge variant="outline">No Score</Badge>
                )}
              </TableCell>
            )}
            {visibleColumns.expectedSalary && (
              <TableCell>
                {candidate.expectedSalary ? (
                  <span className="text-sm font-medium">฿{candidate.expectedSalary.toLocaleString()}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </TableCell>
            )}
            {visibleColumns.status && (
              <TableCell>
                {candidate.isBlacklisted ? (
                  <BlacklistBadge />
                ) : (
                  <StatusBadge statusId={candidate.statusId} stageNames={stageNames} />
                )}
              </TableCell>
            )}
            {visibleColumns.applicationDate && (
              <TableCell>
                {candidate.applicationDate ? (
                  <div className="text-sm">
                    {new Date(candidate.applicationDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">N/A</span>
                )}
              </TableCell>
            )}
            {visibleColumns.actions && (
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCandidateClick(candidate.id)}
                    className="hover:bg-primary/10"
                  >
                    <Eye className="h-4 w-4" />
                    <span className="ml-1 text-xs">View</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      await onPinToggle(candidate);
                    }}
                    title={candidate.isPinned ? 'Unpin' : 'Pin'}
                    className="hover:bg-primary/10"
                  >
                    {candidate.isPinned ? (
                      <PinIcon className="h-4 w-4 text-primary fill-current rotate-45" />
                    ) : (
                      <PinIcon className="h-4 w-4 text-black rotate-45" />
                    )}
                  </Button>
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

