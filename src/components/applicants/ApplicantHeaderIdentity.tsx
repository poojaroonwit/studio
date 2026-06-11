import { ClipboardDocumentIcon as Copy } from "@heroicons/react/24/outline";
import { Pin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Applicant } from "@/lib/types";
import { BlacklistBadge } from "./BlacklistBadge";

interface ApplicantIdentityBlockProps {
  applicant: Applicant;
  isMobile: boolean;
  nameInfo: {
    fontClass: string;
    lang: string;
    name: string;
  };
  onCopyId: () => void;
}

export function ApplicantIdentityBlock({
  applicant,
  isMobile,
  nameInfo,
  onCopyId,
}: ApplicantIdentityBlockProps) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span
          className={`text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent line-clamp-1 ${nameInfo.fontClass}`}
          lang={nameInfo.lang}
        >
          {nameInfo.name}
          {applicant.isPinned && (
            <Pin className="inline-block ml-2 h-4 w-4 text-amber-500 fill-current align-text-top" />
          )}
        </span>
        <div className="flex items-center gap-2">
          {!isMobile && applicant.id && (
            <button
              type="button"
              onClick={onCopyId}
              className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors duration-200 group"
              title={`Copy ID: ${applicant.id}`}
            >
              <Copy className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                ID
              </span>
            </button>
          )}
          {applicant.isPinned && (
            <Badge
              variant="secondary"
              className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 flex items-center gap-1"
            >
              <Pin className="w-3 h-3 rotate-45 fill-current text-blue-600 dark:text-blue-400" />
              Pinned
            </Badge>
          )}
          {applicant.isBlacklisted && (
            <BlacklistBadge
              className="px-2 py-1 rounded-full flex items-center gap-1"
              iconClassName="w-3 h-3"
            />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
        {applicant.email && (
          <ContactItem iconPath="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z">
            {applicant.email}
          </ContactItem>
        )}
        {applicant.phone && (
          <ContactItem iconPath="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z">
            {applicant.phone}
          </ContactItem>
        )}
      </div>
    </div>
  );
}

function ContactItem({
  children,
  iconPath,
}: {
  children: React.ReactNode;
  iconPath: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <svg
        className="h-4 w-4 text-muted-foreground/60"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={iconPath}
        />
      </svg>
      <span className="font-medium text-foreground">{children}</span>
    </div>
  );
}
