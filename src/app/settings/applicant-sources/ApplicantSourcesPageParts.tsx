"use client";

import { Loader2, PlusCircle, ServerCrash } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ApplicantSource } from '@/lib/types';
import { ApplicantSourcesTableRow } from './ApplicantSourcesTableRow';

type ApplicantSourcesHeaderProps = {
  showLogoOnly: boolean;
  onCreate: () => void;
};

export function ApplicantSourcesHeader({
  showLogoOnly,
  onCreate,
}: ApplicantSourcesHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div>
        {!showLogoOnly && (
          <h1 className="text-3xl font-bold tracking-tight">Applicant Sources</h1>
        )}
        <p className="text-muted-foreground mt-2">
          Manage Applicant source options and settings for tracking where Applicants come from.
        </p>
      </div>
      <Button onClick={onCreate} className="flex items-center gap-2">
        <PlusCircle className="h-4 w-4" />
        Add Source
      </Button>
    </div>
  );
}

type ApplicantSourcesErrorBannerProps = {
  message: string;
  onRetry: () => void;
};

export function ApplicantSourcesErrorBanner({
  message,
  onRetry,
}: ApplicantSourcesErrorBannerProps) {
  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
      <ServerCrash className="h-5 w-5 text-destructive" />
      <div>
        <p className="font-medium text-destructive">Failed to load Applicant sources</p>
        <p className="text-sm text-destructive/80">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

type ApplicantSourcesTableProps = {
  sources: ApplicantSource[];
  isLoading: boolean;
  isReordering: boolean;
  onEdit: (source: ApplicantSource) => void;
  onDelete: (source: ApplicantSource) => void;
  onReorder: (sourceId: string, newSortOrder: number) => void;
};

export function ApplicantSourcesTable({
  sources,
  isLoading,
  isReordering,
  onEdit,
  onDelete,
  onReorder,
}: ApplicantSourcesTableProps) {
  return (
    <div className="bg-card rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Logo</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Sub Source</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </TableCell>
            </TableRow>
          ) : sources.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                No Applicant sources found. Create your first source to get started.
              </TableCell>
            </TableRow>
          ) : (
            sources.map((source, index) => (
              <ApplicantSourcesTableRow
                key={source.id}
                source={source}
                index={index}
                totalSources={sources.length}
                isReordering={isReordering}
                onEdit={onEdit}
                onDelete={onDelete}
                onReorder={onReorder}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
