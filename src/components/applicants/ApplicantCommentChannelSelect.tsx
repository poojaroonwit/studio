"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { ApplicantCommentChannel } from "./applicant-comments-utils";

interface ApplicantCommentChannelSelectProps {
  selectedChannel: ApplicantCommentChannel;
  onChannelChange: (channel: ApplicantCommentChannel) => void;
  canViewAllComments: boolean;
  canViewRemarksOnly: boolean;
  canViewActivities: boolean;
}

export function ApplicantCommentChannelSelect({
  selectedChannel,
  onChannelChange,
  canViewAllComments,
  canViewRemarksOnly,
  canViewActivities,
}: ApplicantCommentChannelSelectProps) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Select value={selectedChannel} onValueChange={(value) => onChannelChange(value as ApplicantCommentChannel)}>
        <SelectTrigger className="w-[180px] h-8 text-[11px] font-semibold border-none bg-transparent hover:bg-muted/50 transition-colors focus:ring-0">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Post as:</span>
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {canViewAllComments && (
            <SelectItem value="comment" className="text-[11px]">Comment</SelectItem>
          )}
          {(canViewAllComments || canViewRemarksOnly) && (
            <SelectItem value="remark" className="text-[11px]">Remark to HM</SelectItem>
          )}
          {canViewActivities && (
            <SelectItem value="activity" className="text-[11px]">Activity</SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
