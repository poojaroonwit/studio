import React from "react";
import {
  ArrowUpTrayIcon as Upload,
  PencilIcon as Edit,
} from "@heroicons/react/24/outline";

import { ApplicantAvatar } from "@/components/ui/applicant-avatar";
import type { Applicant } from "@/lib/types";

interface ApplicantHeaderAvatarProps {
  applicant: Applicant;
  avatarError: string | null;
  avatarForceRefresh: boolean;
  avatarInputRef: React.RefObject<HTMLInputElement>;
  avatarUploading: boolean;
  isEditing: boolean;
  isMobile: boolean;
  onAvatarClick: React.MouseEventHandler<HTMLDivElement>;
  onAvatarUpload: (file: File) => void;
}

export function ApplicantHeaderAvatar({
  applicant,
  avatarError,
  avatarForceRefresh,
  avatarInputRef,
  avatarUploading,
  isEditing,
  isMobile,
  onAvatarClick,
  onAvatarUpload,
}: ApplicantHeaderAvatarProps) {
  const triggerAvatarUpload = () => {
    if (avatarInputRef?.current) {
      avatarInputRef.current.click();
    } else {
      console.error("[ApplicantHeader] File input ref is null");
    }
  };

  return (
    <div className="flex-shrink-0 relative">
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300" />
        <div
          className="relative"
          onClick={onAvatarClick}
          style={{ cursor: isMobile ? "pointer" : "default" }}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.currentTarget.click();
            }
          }}
        >
          <ApplicantAvatar
            user={applicant}
            size="xl"
            className="w-20 h-20 text-3xl"
            forceRefresh={avatarForceRefresh}
          />
          <div
            data-avatar-upload-button="true"
            role="button"
            tabIndex={0}
            className="absolute -bottom-1 -right-1 p-2 bg-background/95 backdrop-blur-sm border border-border/50 rounded-full hover:bg-primary/10 hover:scale-110 transition-all duration-200 z-10 flex items-center justify-center shadow-lg"
            title="Change profile picture"
            onClick={(event) => {
              event.stopPropagation();
              triggerAvatarUpload();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                triggerAvatarUpload();
              }
            }}
            aria-disabled={avatarUploading}
            style={{ pointerEvents: avatarUploading ? "none" : "auto" }}
          >
            <Edit className="w-4 h-4 text-primary" />
          </div>
          <input
            type="file"
            accept="image/*"
            ref={avatarInputRef}
            style={{ display: "none" }}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (file) {
                await onAvatarUpload(file);
              }
              event.target.value = "";
            }}
            tabIndex={-1}
            aria-hidden="true"
          />
          {avatarUploading && !isEditing && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-full">
              <div className="flex flex-col items-center justify-center space-y-2 p-3">
                <div className="relative">
                  <div className="w-8 h-8 border-2 border-primary/20 rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <Upload className="absolute inset-0 w-8 h-8 text-primary/60 animate-bounce" />
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  Uploading...
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {avatarError && (
        <div className="text-xs text-destructive mt-2 text-center bg-destructive/10 px-2 py-1 rounded-md">
          {avatarError}
        </div>
      )}
    </div>
  );
}
