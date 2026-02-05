"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, ChevronUp, ChevronDown, MoreVertical, Pin as PinIcon, Ban, FileText } from 'lucide-react';
import { StatusBadge } from '@/components/applicants/ApplicantKanbanView';
import { ScoreBadge } from '@/components/ui/score-color';
import { formatScoreWithGrade } from '@/lib/scoreUtils';
import { BlacklistBadge } from '@/components/applicants/BlacklistBadge';
import type { Applicant } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PotentialCandidatesTableProps {
  applicants: Applicant[];
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  openMenu: string | null;
  stageNames: Record<string, string>;
  onSort: (column: string | null, direction?: 'asc' | 'desc' | null) => void;
  onOpenMenuChange: (menu: string | null) => void;
  onApplicantClick: (candidateId: string) => void;
  onPinToggle: (Applicant: Applicant) => Promise<void>;
}

export function PotentialCandidatesTable({
  applicants,
  sortColumn,
  sortDirection,
  openMenu,
  stageNames,
  onSort,
  onOpenMenuChange,
  onApplicantClick,
  onPinToggle,
}: PotentialCandidatesTableProps) {
  if (applicants.length === 0) {
    return (
      <div className="text-center py-8">
        <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No Job Matches Found</h3>
        <p className="text-muted-foreground">No candidates with job matches for this position who haven't applied yet.</p>
      </div>
    );
  }

  let rowNumber = 1;

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
          <SortableHeader column="name" label="Candidate" />
          <SortableHeader column="fitScore" label="Fit Score" />
          <SortableHeader column="status" label="Status" />
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {applicants.map((applicant) => (
          <TableRow key={applicant.id} className={applicant.isPinned ? 'bg-primary/15 dark:bg-primary/25' : ''}>
            <TableCell>{rowNumber++}</TableCell>
            <TableCell>
              <div>
                <div 
                  className={cn(
                    "font-medium cursor-pointer hover:text-primary hover:underline flex items-center gap-2",
                    applicant.isBlacklisted && "text-destructive"
                  )}
                  onClick={() => onApplicantClick(applicant.id)}
                >
                  {applicant.name}
                  {applicant.isBlacklisted && <Ban className="h-3 w-3" />}
                </div>
                <div className="text-xs text-muted-foreground">{applicant.email}</div>
              </div>
            </TableCell>
            <TableCell>
              {applicant.fitScore !== undefined && applicant.fitScore !== null ? (
                <ScoreBadge score={applicant.fitScore}>
                  {formatScoreWithGrade(applicant.fitScore)}
                </ScoreBadge>
              ) : (
                <Badge variant="outline">No Score</Badge>
              )}
            </TableCell>
            <TableCell>
              {applicant.isBlacklisted ? (
                <BlacklistBadge />
              ) : (
                <StatusBadge statusId={applicant.statusId} stageNames={stageNames} />
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onApplicantClick(applicant.id)}
                  className="hover:bg-primary/10"
                >
                  <Eye className="h-4 w-4" />
                  <span className="ml-1 text-xs">View</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await onPinToggle(applicant);
                  }}
                  title={applicant.isPinned ? 'Unpin' : 'Pin'}
                  className="hover:bg-primary/10"
                >
                  {applicant.isPinned ? (
                    <PinIcon className="h-4 w-4 text-blue-600 fill-current rotate-45" />
                  ) : (
                    <PinIcon className="h-4 w-4 text-black rotate-45" />
                  )}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

