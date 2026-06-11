"use client";

import { format } from 'date-fns';
import { Edit, FileText, Paperclip, Trash2 } from 'lucide-react';

import { ApplicantAvatar } from '@/components/ui/applicant-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Headcount } from '@/lib/types';

import type { HeadcountSLAData, HeadcountTypeOption } from './hooks/use-headcount-tab-data';
import {
  getHeadcountActualStatus,
  getHeadcountStatusOption,
} from './headcount-table-utils';

export function HeadcountTypeBadge({
  headcount,
  headcountTypeOptions,
}: {
  headcount: Headcount;
  headcountTypeOptions: HeadcountTypeOption[];
}) {
  const option = headcountTypeOptions.find((opt) => opt.value === headcount.type);

  return (
    <Badge className={option?.color || 'bg-gray-100 text-gray-800'}>
      {option?.label || headcount.type}
    </Badge>
  );
}

export function HeadcountStatusBadge({ headcount }: { headcount: Headcount }) {
  const option = getHeadcountStatusOption(getHeadcountActualStatus(headcount));

  return (
    <Badge className={option.color}>
      {option.label}
    </Badge>
  );
}

export function HeadcountSLABadge({ slaData }: { slaData?: HeadcountSLAData }) {
  if (!slaData) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (slaData.error) {
    return (
      <div className="text-sm text-muted-foreground" title={slaData.error}>
        No SLA
      </div>
    );
  }

  if (!slaData.violation) {
    return <div className="text-sm text-muted-foreground">No SLA</div>;
  }

  const { violation } = slaData;

  if (violation.isViolated) {
    return (
      <Badge className="text-xs bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">
        {violation.daysOverdue} days overdue
      </Badge>
    );
  }

  return (
    <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
      {violation.daysRemaining} days left
    </Badge>
  );
}

export function HeadcountDateCell({ value }: { value?: string | null }) {
  if (!value) {
    return <div className="text-sm text-muted-foreground">Not set</div>;
  }

  return <div className="text-sm">{format(new Date(value), 'MMM dd, yyyy')}</div>;
}

export function HeadcountApplicantCell({ headcount }: { headcount: Headcount }) {
  if (!headcount.applicant) {
    return <span className="text-muted-foreground text-sm">No Applicant assigned</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <ApplicantAvatar
        user={headcount.applicant}
        size="sm"
        className="h-6 w-6"
      />
      <div>
        <div className="font-medium text-sm">{headcount.applicant.name}</div>
        <div className="text-xs text-muted-foreground">{headcount.applicant.email}</div>
      </div>
    </div>
  );
}

export function HeadcountMemoCell({ memoId }: { memoId?: string | null }) {
  if (!memoId) {
    return <span className="text-muted-foreground text-sm">No memo</span>;
  }

  return (
    <div className="flex items-center gap-1 max-w-xs">
      <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      <span className="text-sm truncate">{memoId}</span>
    </div>
  );
}

export function HeadcountEmployeeCell({ employeeId }: { employeeId?: string | null }) {
  if (!employeeId) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  return (
    <div className="flex items-center gap-1 max-w-xs">
      <Badge variant="outline" className="text-xs font-mono">
        {employeeId}
      </Badge>
    </div>
  );
}

export function HeadcountAttachmentCount({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1">
      <Paperclip className="h-3 w-3 text-muted-foreground" />
      <span className="text-sm">{count}</span>
    </div>
  );
}

export function HeadcountRowActions({
  headcount,
  onDelete,
  onEdit,
  onManageAttachments,
}: {
  headcount: Headcount;
  onDelete: (headcountId: string) => void;
  onEdit: (headcount: Headcount) => void;
  onManageAttachments: (headcount: Headcount) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEdit(headcount)}
        title="Edit headcount"
        className="h-8 w-8 p-0"
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onManageAttachments(headcount)}
        title="Manage attachments"
        className="h-8 w-8 p-0"
      >
        <Paperclip className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(headcount.id)}
        title="Delete headcount"
        className="h-8 w-8 p-0"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
