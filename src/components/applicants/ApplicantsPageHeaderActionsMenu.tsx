"use client";

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  ArrowDownTrayIcon as FileDown,
  Cog6ToothIcon as Settings,
  EllipsisVerticalIcon as MoreVertical,
  PlusCircleIcon as PlusCircle,
  TableCellsIcon as FileSpreadsheet,
} from '@heroicons/react/24/outline';

type HeaderActionHandlers = {
  onAddApplicant: () => void;
  onBulkUpload: () => void;
  onExport: () => void;
  onImport: () => void;
  onSettings: () => void;
};

interface ApplicantsHeaderActionsMenuProps extends HeaderActionHandlers {
  disabled: boolean;
  exportImportFeatureEnabled: boolean;
}

export function ApplicantsHeaderUploadButton({
  disabled,
  onBulkUpload,
}: Pick<ApplicantsHeaderActionsMenuProps, 'disabled' | 'onBulkUpload'>) {
  return (
    <Button
      onClick={onBulkUpload}
      disabled={disabled}
      className="mb-2 h-8 px-3"
    >
      Upload CVs
    </Button>
  );
}

export function ApplicantsHeaderActionsMenu({
  disabled,
  exportImportFeatureEnabled,
  onAddApplicant,
  onExport,
  onImport,
  onSettings,
}: ApplicantsHeaderActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          disabled={disabled}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 ml-2 mb-2 hover:bg-muted/50 transition-colors duration-200"
        >
          <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onAddApplicant} className="text-sm py-2">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Applicant
        </DropdownMenuItem>
        {exportImportFeatureEnabled && (
          <>
            <DropdownMenuItem onClick={onExport} className="text-sm py-2">
              <FileDown className="mr-2 h-4 w-4" />
              Export to Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onImport} className="text-sm py-2">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Import Data
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem onClick={onSettings} className="text-sm py-2">
          <Settings className="mr-2 h-4 w-4" />
          Settings Page
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
