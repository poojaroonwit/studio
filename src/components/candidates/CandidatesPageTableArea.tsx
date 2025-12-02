"use client";

import React from 'react';
import { CandidateTable } from './CandidateTable';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Trash2, FileEdit, Users, RefreshCw, ChevronDown } from 'lucide-react';
import type { Candidate, Position, RecruitmentStage } from '@/lib/types';
import type { CandidateSettings } from './CandidateSettingsDrawer';
import { useIsMobile } from '@/hooks/use-mobile';

interface CandidatesPageTableAreaProps {
  candidatesToRender: Candidate[];
  allPinnedCandidates: Candidate[];
  displayedCandidates: Candidate[];
  isLoading: boolean;
  tableLoading: boolean;
  updateCandidateStatus: (candidateId: string, status: string, notes?: string, suppressToast?: boolean) => Promise<void>;
  handleDeleteCandidate: (candidateId: string) => Promise<void>;
  handleAssignRecruiter: (candidateId: string, recruiterId: string | null) => Promise<void>;
  handleAssignSource: (candidateId: string, sourceId: string | null, subSource?: string | null) => Promise<void>;
  availablePositions: Position[];
  availableStages: RecruitmentStage[];
  availableRecruiter: Array<{ id: string; name: string }>;
  availableSources: Array<{ id: string; name: string; logo?: string | null }>;
  canEditCandidates: boolean;
  canDeleteCandidates: boolean;
  canChangeStatus: boolean;
  canBulkChangeStatus: boolean;
  canViewDetailed: boolean;
  canAssignSource: boolean;
  canAssignRecruiter: boolean;
  sortColumn: string;
  sortDirection: 'asc' | 'desc' | null;
  handleSortChange: (column: string | null, direction?: 'asc' | 'desc' | null) => Promise<void>;
  setSelectedPositionForEdit: (position: Position | null) => void;
  refreshCandidateInList: (candidateId: string, fetchTableData: any, filters: any, page: number, pageSize: number, aiMatchedCandidateIds: string[] | null) => Promise<void>;
  fetchAllPinnedCandidates: () => Promise<void>;
  selectedCandidateIds: Set<string>;
  setSelectedCandidateIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleBulkDelete: (candidateIds: string[]) => Promise<void>;
  handleBulkChangeStatus: (candidateIds: string[], newStatus: string, notes?: string) => Promise<void>;
  handleBulkAssignRecruiter: (candidateIds: string[], recruiterId: string | null) => Promise<void>;
  handleBulkReprocess: (candidateIds: string[]) => Promise<void>;
  setBulkNewStatus: React.Dispatch<React.SetStateAction<string>>;
  setBulkTransitionNotes: React.Dispatch<React.SetStateAction<string>>;
  setIsBulkStatusModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setBulkNewRecruiterId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsBulkRecruiterModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  candidateSettings: CandidateSettings | null;
  tableHeight: number;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  pageSize: number;
  handlePageSizeChange: (newPageSize: number) => Promise<void>;
  total: number;
  totalPages: number;
  isAiSearchActive: boolean;
  aiMatchedCandidateIds: string[] | null;
  aiRecordCount: number;
  filters: any;
  fetchTableData: (filters: any, page: number, pageSize: number) => Promise<void>;
  aiMatchedCandidateIdsForRefresh: string[] | null;
}

export function CandidatesPageTableArea({
  candidatesToRender,
  allPinnedCandidates,
  displayedCandidates,
  isLoading,
  tableLoading,
  updateCandidateStatus,
  handleDeleteCandidate,
  handleAssignRecruiter,
  handleAssignSource,
  availablePositions,
  availableStages,
  availableRecruiter,
  availableSources,
  canEditCandidates,
  canDeleteCandidates,
  canChangeStatus,
  canBulkChangeStatus,
  canViewDetailed,
  canAssignSource,
  canAssignRecruiter,
  sortColumn,
  sortDirection,
  handleSortChange,
  setSelectedPositionForEdit,
  refreshCandidateInList,
  fetchAllPinnedCandidates,
  selectedCandidateIds,
  setSelectedCandidateIds,
  handleBulkDelete,
  handleBulkChangeStatus,
  handleBulkAssignRecruiter,
  handleBulkReprocess,
  setBulkNewStatus,
  setBulkTransitionNotes,
  setIsBulkStatusModalOpen,
  setBulkNewRecruiterId,
  setIsBulkRecruiterModalOpen,
  candidateSettings,
  tableHeight,
  page,
  setPage,
  pageSize,
  handlePageSizeChange,
  total,
  totalPages,
  isAiSearchActive,
  aiMatchedCandidateIds,
  aiRecordCount,
  filters,
  fetchTableData,
  aiMatchedCandidateIdsForRefresh,
}: CandidatesPageTableAreaProps) {
  const isMobile = useIsMobile();
  
  return (
    <>
      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <CandidateTable
          candidates={Array.isArray(candidatesToRender) ? candidatesToRender : []}
          allPinnedCandidates={Array.isArray(allPinnedCandidates) ? allPinnedCandidates : []}
          isLoading={(isLoading || tableLoading) && displayedCandidates.length === 0}
          onUpdateCandidate={updateCandidateStatus}
          onDeleteCandidate={handleDeleteCandidate}
          onAssignRecruiter={handleAssignRecruiter}
          onAssignSource={handleAssignSource}
          availablePositions={availablePositions}
          availableStages={availableStages}
          availableRecruiter={availableRecruiter}
          availableSources={availableSources}
          canManageCandidates={canEditCandidates}
          canEditCandidates={canEditCandidates}
          canDeleteCandidates={canDeleteCandidates}
          canChangeStatus={canChangeStatus}
          canViewDetailed={canViewDetailed}
          canAssignSource={canAssignSource}
          canAssignRecruiter={canAssignRecruiter}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={(column, direction) => {
            if (direction !== undefined && direction !== null) {
              handleSortChange(column || 'applicationDate', direction);
            } else if (column === sortColumn) {
              if (sortDirection === 'asc') {
                handleSortChange(column, 'desc');
              } else if (sortDirection === 'desc') {
                handleSortChange(column, null);
              } else {
                handleSortChange(column, 'asc');
              }
            } else {
              handleSortChange(column, 'asc');
            }
          }}
          onEditPosition={setSelectedPositionForEdit}
          onRefreshCandidateData={async (candidateId) => {
            await refreshCandidateInList(candidateId, fetchTableData, filters, page, pageSize, aiMatchedCandidateIdsForRefresh);
            await fetchAllPinnedCandidates();
          }}
          selectedCandidateIds={selectedCandidateIds}
          onToggleSelectCandidate={(candidateId) => {
            const newSelected = new Set(selectedCandidateIds);
            if (newSelected.has(candidateId)) {
              newSelected.delete(candidateId);
            } else {
              newSelected.add(candidateId);
            }
            setSelectedCandidateIds(newSelected);
          }}
          onToggleSelectAllCandidates={() => {
            if (selectedCandidateIds.size === displayedCandidates.length) {
              setSelectedCandidateIds(new Set());
            } else {
              const safeDisplayedCandidates = Array.isArray(displayedCandidates) ? displayedCandidates : [];
              setSelectedCandidateIds(new Set(safeDisplayedCandidates.map(c => c.id)));
            }
          }}
          isAllCandidatesSelected={selectedCandidateIds.size === displayedCandidates.length && displayedCandidates.length > 0}
          page={page}
          pageSize={pageSize}
          baseIndex={(page - 1) * pageSize}
          onBulkDelete={handleBulkDelete}
          onBulkChangeStatus={handleBulkChangeStatus}
          onBulkAssignRecruiter={handleBulkAssignRecruiter}
          onBulkReprocess={handleBulkReprocess}
          settings={candidateSettings}
          tableHeight={tableHeight}
        />
      </div>

      {/* Bulk Action Footer */}
      {selectedCandidateIds && selectedCandidateIds.size > 0 && (
        <div className="border-t bg-muted/30 p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {selectedCandidateIds.size} candidate{selectedCandidateIds.size !== 1 ? 's' : ''} selected
              </span>
              
              <div className="flex items-center gap-1">
                <Button
                  onClick={() => handleBulkDelete(Array.from(selectedCandidateIds))}
                  disabled={!canDeleteCandidates}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
                
                <Button
                  onClick={() => {
                    setBulkNewStatus('');
                    setBulkTransitionNotes('');
                    setIsBulkStatusModalOpen(true);
                  }}
                  disabled={!canBulkChangeStatus}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                >
                  <FileEdit className="h-3 w-3 mr-1" />
                  Status
                </Button>
                
                <Button
                  onClick={() => {
                    setBulkNewRecruiterId(null);
                    setIsBulkRecruiterModalOpen(true);
                  }}
                  disabled={!canEditCandidates}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                >
                  <Users className="h-3 w-3 mr-1" />
                  Recruiter
                </Button>
                
                <Button
                  onClick={() => handleBulkReprocess(Array.from(selectedCandidateIds))}
                  disabled={!canEditCandidates}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Re-process
                </Button>
              </div>
            </div>
            
            <Button
              onClick={() => setSelectedCandidateIds(new Set())}
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Pagination / See More */}
      {isMobile ? (
        /* Mobile: See More Button */
        <div className="p-4 border-t">
          {(() => {
            const currentTotal = isAiSearchActive && aiMatchedCandidateIds ? aiRecordCount : total;
            const hasMore = page < totalPages;
            
            if (currentTotal === 0) {
              return (
                <div className="text-center text-sm text-muted-foreground py-2">
                  {isAiSearchActive ? 'No AI-matched candidates found' : 'No candidates found'}
                </div>
              );
            }
            
            if (!hasMore) {
              return (
                <div className="text-center text-sm text-muted-foreground py-2">
                  {isAiSearchActive && aiMatchedCandidateIds
                    ? `Showing all ${currentTotal} AI-matched candidates`
                    : `Showing all ${currentTotal} candidates`}
                </div>
              );
            }
            
            return (
              <div className="flex flex-col items-center gap-2">
                <div className="text-sm text-muted-foreground text-center">
                  {(() => {
                    const currentPageSize = pageSize;
                    const startItem = ((page - 1) * currentPageSize) + 1;
                    const endItem = Math.min(page * currentPageSize, currentTotal);
                    return isAiSearchActive && aiMatchedCandidateIds
                      ? `Showing ${startItem} to ${endItem} of ${currentTotal} AI-matched candidates`
                      : `Showing ${startItem} to ${endItem} of ${currentTotal} candidates`;
                  })()}
                </div>
                <Button
                  onClick={() => {
                    const newPage = page + 1;
                    setPage(newPage);
                    if (filters) {
                      fetchTableData(filters, newPage, pageSize);
                    }
                  }}
                  variant="outline"
                  className="w-full max-w-xs"
                >
                  See More
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </div>
            );
          })()}
        </div>
      ) : (
        /* Desktop: Full Pagination */
        <div className="p-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                {(() => {
                  const currentTotal = isAiSearchActive && aiMatchedCandidateIds ? aiRecordCount : total;
                  const currentPageSize = pageSize;
                  const startItem = ((page - 1) * currentPageSize) + 1;
                  const endItem = Math.min(page * currentPageSize, currentTotal);
                  
                  if (currentTotal === 0) {
                    return isAiSearchActive ? 'No AI-matched candidates found' : 'No candidates found';
                  }
                  
                  if (isAiSearchActive && aiMatchedCandidateIds) {
                    return `Showing ${startItem} to ${endItem} of ${currentTotal} AI-matched candidates`;
                  }
                  
                  return `Showing ${startItem} to ${endItem} of ${currentTotal} candidates`;
                })()}
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Items per page:</span>
                <Select 
                  value={pageSize.toString()} 
                  onValueChange={(value) => {
                    const newPageSize = parseInt(value);
                    handlePageSizeChange(newPageSize);
                    if (filters) {
                      fetchTableData(filters, 1, newPageSize);
                    }
                  }}
                >
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="1000">1000</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => {
                  const newPage = Math.max(1, page - 1);
                  setPage(newPage);
                  if (filters) {
                    fetchTableData(filters, newPage, pageSize);
                  }
                }}
                disabled={(() => {
                  const currentTotal = isAiSearchActive && aiMatchedCandidateIds ? aiRecordCount : total;
                  return page <= 1 || currentTotal === 0;
                })()}
                variant="ghost"
                size="sm"
                className="h-8 px-3 hover:bg-muted/50 transition-colors duration-200"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground mr-2" />
              </Button>
              
              <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                {(() => {
                  const currentTotal = isAiSearchActive && aiMatchedCandidateIds ? aiRecordCount : total;
                  if (currentTotal === 0) {
                    return 'No pages';
                  }
                  return `Page ${page} of ${totalPages}`;
                })()}
              </span>
              
              <Button
                onClick={() => {
                  const newPage = Math.min(totalPages, page + 1);
                  setPage(newPage);
                  if (filters) {
                    fetchTableData(filters, newPage, pageSize);
                  }
                }}
                disabled={(() => {
                  const currentTotal = isAiSearchActive && aiMatchedCandidateIds ? aiRecordCount : total;
                  return page >= totalPages || currentTotal === 0;
                })()}
                variant="ghost"
                size="sm"
                className="h-8 px-3 hover:bg-muted/50 transition-colors duration-200"
              >
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

