import type { ReactNode } from 'react';
import {
  ChartBarIcon as Activity,
  ChatBubbleLeftRightIcon as MessageSquare,
  DocumentIcon as FileIcon,
} from '@heroicons/react/24/outline';

import { cn } from '@/lib/utils';
import type {
  ApplicantCommentChannel,
  ApplicantCommentsTab,
} from './applicant-comments-utils';

interface ApplicantCommentCounts {
  all: number;
  comment: number;
  remark: number;
  activity: number;
}

interface ApplicantCommentsSubTabsProps {
  activeTab: ApplicantCommentsTab;
  counts: ApplicantCommentCounts;
  canViewAllComments: boolean;
  canViewRemarksOnly: boolean;
  canViewActivities: boolean;
  onTabChange: (tab: ApplicantCommentsTab, channel: ApplicantCommentChannel) => void;
}

function ApplicantCommentsSubTabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 text-sm font-medium transition-all duration-200 relative cursor-pointer whitespace-nowrap pb-3 border-b-2 px-1 rounded-none bg-transparent pt-1",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
      )}
    >
      {children}
    </button>
  );
}

export function ApplicantCommentsSubTabs({
  activeTab,
  counts,
  canViewAllComments,
  canViewRemarksOnly,
  canViewActivities,
  onTabChange,
}: ApplicantCommentsSubTabsProps) {
  return (
    <div className="flex items-center border-b mb-4 overflow-x-auto no-scrollbar gap-6">
      {canViewAllComments && (
        <ApplicantCommentsSubTabButton
          active={activeTab === 'all'}
          onClick={() => onTabChange('all', 'comment')}
        >
          <FileIcon className="h-4 w-4" />
          All {counts.all > 0 && `(${counts.all})`}
        </ApplicantCommentsSubTabButton>
      )}

      {canViewAllComments && (
        <ApplicantCommentsSubTabButton
          active={activeTab === 'comment'}
          onClick={() => onTabChange('comment', 'comment')}
        >
          <MessageSquare className="h-4 w-4" />
          Comment {counts.comment > 0 && `(${counts.comment})`}
        </ApplicantCommentsSubTabButton>
      )}

      {(canViewAllComments || canViewRemarksOnly) && (
        <ApplicantCommentsSubTabButton
          active={activeTab === 'remark'}
          onClick={() => onTabChange('remark', 'remark')}
        >
          <MessageSquare className="h-4 w-4 text-purple-500" />
          Remark {counts.remark > 0 && `(${counts.remark})`}
        </ApplicantCommentsSubTabButton>
      )}

      {canViewActivities && (
        <ApplicantCommentsSubTabButton
          active={activeTab === 'activity'}
          onClick={() => onTabChange('activity', 'activity')}
        >
          <Activity className="h-4 w-4" />
          Activity {counts.activity > 0 && `(${counts.activity})`}
        </ApplicantCommentsSubTabButton>
      )}
    </div>
  );
}
