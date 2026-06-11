"use client";

import type { ReactNode } from 'react';
import { UsersIcon as Users } from '@heroicons/react/24/outline';
import { Pin as PinIcon } from 'lucide-react';

import { TableCell, TableRow } from '@/components/ui/table';
import type { Applicant } from '@/lib/types';

import type { ApplicantSettings } from './applicant-settings-types';
import { getRowHeightStyle, getRowPaddingClass } from './ApplicantTableRow';

interface ApplicantDesktopRowsProps {
  applicants: Applicant[];
  applicantsByPinStatus: { pinned: Applicant[]; unpinned: Applicant[] };
  baseIndex: number;
  renderApplicantRows: (applicants: Applicant[], startRowNumber: number) => ReactNode;
  settings?: ApplicantSettings;
  visibleColumnCount: number;
}

export function ApplicantDesktopRows({
  applicants,
  applicantsByPinStatus,
  baseIndex,
  renderApplicantRows,
  settings,
  visibleColumnCount,
}: ApplicantDesktopRowsProps) {
  const { pinned, unpinned } = applicantsByPinStatus;

  if (!settings?.showPinSection) {
    return <>{renderApplicantRows(applicants, baseIndex + 1)}</>;
  }

  return (
    <>
      {pinned.length > 0 && (
        <>
          <TableRow className={`bg-primary/15 dark:bg-primary/25 border-b-2 border-primary/30 ${getRowPaddingClass(settings?.rowHeight)}`}>
            <TableCell colSpan={visibleColumnCount} className="px-4">
              <div className="flex items-center gap-2">
                <PinIcon className="h-4 w-4 text-primary" />
                <span className="font-semibold text-primary">Pinned Applicants</span>
                <span className="text-sm text-muted-foreground">
                  ({pinned.length} applicant{pinned.length !== 1 ? 's' : ''})
                </span>
              </div>
            </TableCell>
          </TableRow>
          {renderApplicantRows(pinned, 1)}
        </>
      )}

      {unpinned.length > 0 && (
        <>
          <TableRow
            className={`bg-muted/30 border-b border-muted ${getRowPaddingClass(settings?.rowHeight)}`}
            style={getRowHeightStyle(settings?.rowHeight)}
          >
            <TableCell colSpan={visibleColumnCount} className="px-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-foreground">All Applicants</span>
                <span className="text-sm text-muted-foreground">
                  ({unpinned.length} applicant{unpinned.length !== 1 ? 's' : ''})
                </span>
              </div>
            </TableCell>
          </TableRow>
          {renderApplicantRows(unpinned, baseIndex + 1)}
        </>
      )}

      {pinned.length === 0 && unpinned.length === 0 && (
        <TableRow>
          <TableCell colSpan={visibleColumnCount} className="text-center py-8 text-muted-foreground">
            No applicants found
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
