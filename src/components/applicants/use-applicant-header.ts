"use client";

import React from "react";
import { useSession } from "next-auth/react";

import { useDynamicZIndex } from "@/contexts/ZIndexContext";
import { useToast } from "@/hooks/use-toast";
import { formatApplicantNameWithLang } from "@/lib/applicantUtils";
import { getCachedAvatarUrl } from "@/lib/imageUtils";
import { sanitizeUrl } from "@/lib/utils";
import type { Applicant } from "@/lib/types";

export function useApplicantHeader(applicant: Applicant, isModal?: boolean) {
  const { data: session } = useSession();
  const { success: toastSuccess } = useToast();
  const { contentZIndex } = useDynamicZIndex("applicant-header", "overlay");
  const nameInfo = React.useMemo(
    () => formatApplicantNameWithLang(applicant),
    [applicant],
  );
  const [isMobile, setIsMobile] = React.useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = React.useState(false);
  const [avatarImageUrl, setAvatarImageUrl] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  React.useEffect(() => {
    if (!isAvatarModalOpen) return;

    let isMounted = true;
    const loadAvatar = async () => {
      try {
        const url = await getCachedAvatarUrl(
          {
            id: applicant.id,
            avatarUrl: applicant.avatarUrl,
          },
          false,
        );
        if (isMounted) {
          setAvatarImageUrl(sanitizeUrl(url || ""));
        }
      } catch (error) {
        console.warn("Failed to load avatar for modal:", error);
        if (isMounted) {
          setAvatarImageUrl(null);
        }
      }
    };

    loadAvatar();
    return () => {
      isMounted = false;
    };
  }, [isAvatarModalOpen, applicant.id, applicant.avatarUrl]);

  const handleAvatarClick = React.useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        isMobile &&
        !target.closest('[data-avatar-upload-button="true"]')
      ) {
        setIsAvatarModalOpen(true);
      }
    },
    [isMobile],
  );

  const handleCopyId = React.useCallback(async () => {
    if (!applicant.id) return;

    try {
      await navigator.clipboard.writeText(applicant.id);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = applicant.id;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    toastSuccess("Applicant ID copied to clipboard");
  }, [applicant.id, toastSuccess]);

  const headerTopClass = isModal
    ? "top-0"
    : session?.user?.impersonatedUserId || session?.user?.impersonatedRole
      ? "top-24"
      : "top-16";

  return {
    avatarImageUrl,
    contentZIndex,
    handleAvatarClick,
    handleCopyId,
    headerTopClass,
    isAvatarModalOpen,
    isMobile,
    nameInfo,
    setIsAvatarModalOpen,
  };
}
