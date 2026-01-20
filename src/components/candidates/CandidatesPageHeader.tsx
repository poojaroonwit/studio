"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { PlusCircleIcon as PlusCircle, ArrowDownTrayIcon as FileDown, TableCellsIcon as FileSpreadsheet, Cog6ToothIcon as Settings, EllipsisVerticalIcon as MoreVertical, CpuChipIcon as Brain } from '@heroicons/react/24/outline';
import { FitScoreFilterTabs } from './FitScoreFilterTabs';
import type { CandidateSettings } from './CandidateSettingsDrawer';

interface CandidatesPageHeaderProps {
  candidateSettings: CandidateSettings | null;
  isMobile: boolean;
  isLoading: boolean;
  tableLoading: boolean;
  horizontalSelectedFitScoreGrades: Set<string>;
  horizontalSelectedMatchingFitScoreGrades: Set<string>;
  onGradeToggle: (grade: string) => void;
  onMatchingGradeToggle: (grade: string) => void;
  onClearAllHorizontalFitScoreFilters: () => void;
  candidateScoreCounts: {
    applied: Array<{ letter: string; count: number }>;
    matching: Array<{ letter: string; count: number }>;
  } | null;
  aiSearchReasoning: string | null;
  aiRecordCount: number;
  isAiSearchActive: boolean;
  exportImportFeatureEnabled: boolean;
  onAddCandidate: () => void;
  onBulkUpload: () => void;
  onExport: () => void;
  onImport: () => void;
  onSettings: () => void;
}

export function CandidatesPageHeader({
  candidateSettings,
  isMobile,
  isLoading,
  tableLoading,
  horizontalSelectedFitScoreGrades,
  horizontalSelectedMatchingFitScoreGrades,
  onGradeToggle,
  onMatchingGradeToggle,
  onClearAllHorizontalFitScoreFilters,
  candidateScoreCounts,
  aiSearchReasoning,
  aiRecordCount,
  isAiSearchActive,
  exportImportFeatureEnabled,
  onAddCandidate,
  onBulkUpload,
  onExport,
  onImport,
  onSettings,
}: CandidatesPageHeaderProps) {
  // Don't show header on mobile or if horizontal fit score filters are disabled
  if (!candidateSettings?.showHorizontalFitScoreFilters || isMobile) {
    return null;
  }

  return (
    <div className="p-2 pb-0 pr-2 border-b">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {candidateSettings.fitScoreType === 'applied' && (
            <FitScoreFilterTabs
              selectedGrades={horizontalSelectedFitScoreGrades}
              onGradeToggle={onGradeToggle}
              onClearAll={onClearAllHorizontalFitScoreFilters}
              candidateCounts={candidateScoreCounts?.applied || []}
              className=""
              filterMode={candidateSettings.fitScoreFilterMode}
              aiMatchedCount={aiRecordCount}
              isAiSearchActive={isAiSearchActive}
            />
          )}
          {candidateSettings.fitScoreType === 'matching' && (
            <FitScoreFilterTabs
              selectedGrades={horizontalSelectedMatchingFitScoreGrades}
              onGradeToggle={onMatchingGradeToggle}
              onClearAll={onClearAllHorizontalFitScoreFilters}
              candidateCounts={candidateScoreCounts?.matching || []}
              className=""
              filterMode={candidateSettings.fitScoreFilterMode}
              aiMatchedCount={aiRecordCount}
              isAiSearchActive={isAiSearchActive}
            />
          )}
        </div>

        <div className="flex items-center space-x-3 ml-3">
          <Button
            onClick={onBulkUpload}
            disabled={isLoading || tableLoading}
            className="mb-2 h-8 px-3"
          >
            Upload CVs
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={isLoading || tableLoading}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 ml-2 mb-2 hover:bg-muted/50 transition-colors duration-200"
              >
                <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={onAddCandidate}
                className="text-sm py-2"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Candidate
              </DropdownMenuItem>
              {exportImportFeatureEnabled && (
                <>
                  <DropdownMenuItem
                    onClick={onExport}
                    className="text-sm py-2"
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    Export to Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onImport}
                    className="text-sm py-2"
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Import Data
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem
                onClick={onSettings}
                className="text-sm py-2"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings Page
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* AI Search Results Display */}
      {aiSearchReasoning && (
        <div className="mt-4 p-3 bg-primary/5 dark:bg-primary/10">
          <div className="flex items-start gap-2">
            <Brain className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-primary">
                  AI Search Results
                </span>
                <Badge className="text-xs bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-foreground">
                  {aiRecordCount} matched
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {aiSearchReasoning}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

