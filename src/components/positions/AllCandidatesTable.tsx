"use client";

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X, Eye, ChevronUp, ChevronDown, MoreVertical, Pin as PinIcon, Ban } from 'lucide-react';
import { StatusBadge } from '@/components/candidates/CandidateKanbanView';
import { ScoreBadge } from '@/components/ui/score-color';
import { formatScoreWithGrade } from '@/lib/scoreUtils';
import { BlacklistBadge } from '@/components/candidates/BlacklistBadge';
import { Pagination } from '@/components/ui/pagination';
import type { Candidate } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AllCandidatesTableProps {
  candidates: Candidate[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  openMenu: string | null;
  stageNames: Record<string, string>;
  onSort: (column: string | null, direction?: 'asc' | 'desc' | null) => void;
  onOpenMenuChange: (menu: string | null) => void;
  onCandidateClick: (candidateId: string) => void;
  onPinToggle: (candidate: Candidate) => Promise<void>;
  total: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function AllCandidatesTable({
  candidates,
  searchTerm,
  onSearchChange,
  sortColumn,
  sortDirection,
  openMenu,
  stageNames,
  onSort,
  onOpenMenuChange,
  onCandidateClick,
  onPinToggle,
  total,
  currentPage,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: AllCandidatesTableProps) {
  const [expandedEmails, setExpandedEmails] = useState<Record<string, boolean>>({});
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

  // Use sorted candidates for email order
  const sortedEmailOrder = candidates
    .map((c) => c.email)
    .filter((email, index, arr) => email && arr.indexOf(email) === index);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
              onClick={() => onSearchChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 text-center">#</TableHead>
              <SortableHeader column="name" label="Candidate" />
              <SortableHeader column="fitScore" label="Fit Score" />
              <SortableHeader column="expectedSalary" label="Exp. Salary" />
              <SortableHeader column="status" label="Status" />
              <SortableHeader column="applicationDate" label="Applied Date" />
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEmailOrder.map((email) => {
              const group = candidates.filter(c => c.email === email);
              if (!group || group.length === 0) return null;

              if (group.length === 1) {
                const candidate = group[0];
                return (
                  <TableRow
                    key={candidate.id}
                    className={`hover:bg-muted/50 ${candidate.isPinned ? 'bg-primary/15 dark:bg-primary/25' : ''}`}
                  >
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">{rowNumber++}</TableCell>
                    <TableCell>
                      <div>
                        <div className={cn(
                          "font-medium flex items-center gap-2",
                          candidate.isBlacklisted && "text-destructive"
                        )}>
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
                        <div className="text-sm font-medium">฿{candidate.expectedSalary.toLocaleString()}</div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCandidateClick(candidate.id)}
                        className="hover:bg-primary/10"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="ml-1 text-xs">View</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              } else {
                // Handle grouped candidates (same email)
                const isExpanded = expandedEmails[email] !== undefined ? expandedEmails[email] : true;
                return (
                  <React.Fragment key={email}>
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={99} className="p-0">
                        <div className="flex items-center gap-2 px-2 py-1 bg-muted">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setExpandedEmails((prev) => ({ ...prev, [email]: !isExpanded }))}
                            className="border border-primary"
                          >
                            {isExpanded ? <ChevronDown /> : <ChevronUp />}
                          </Button>
                          <span className="font-semibold">{email}</span>
                          <span className="text-xs text-muted-foreground">({group.length} candidates)</span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && group.map((candidate) => (
                      <TableRow
                        key={candidate.id}
                        className={`hover:bg-muted/50 ${candidate.isPinned ? 'bg-primary/15 dark:bg-primary/25' : ''}`}
                      >
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">{rowNumber++}</TableCell>
                        <TableCell>
                          <div>
                            <div className={cn(
                              "font-medium flex items-center gap-2",
                              candidate.isBlacklisted && "text-destructive"
                            )}>
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
                            <div className="text-sm font-medium">฿{candidate.expectedSalary.toLocaleString()}</div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
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
                  </React.Fragment>
                );
              }
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}

