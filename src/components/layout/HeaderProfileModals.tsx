"use client";

import dynamic from "next/dynamic";
import type { UnifiedUserFormValues } from "@/components/users/UnifiedUserModal";
import type { UserProfile } from "@/lib/types";

import type { HeaderUserSummary } from "./HeaderUserMenu.types";

const UnifiedUserModal = dynamic(
  () => import("@/components/users/UnifiedUserModal").then((module) => module.UnifiedUserModal),
  { ssr: false },
);

interface HeaderProfileModalsProps {
  user: HeaderUserSummary | null;
  isUserModalOpen: boolean;
  setIsUserModalOpen: (open: boolean) => void;
  fullUserData: UserProfile | null;
  sessionUser: UserProfile | null;
  onSaveProfile: (data: UnifiedUserFormValues) => Promise<void>;
}

export function HeaderProfileModals({
  user,
  isUserModalOpen,
  setIsUserModalOpen,
  fullUserData,
  sessionUser,
  onSaveProfile,
}: HeaderProfileModalsProps) {
  if (!user) {
    return null;
  }

  return isUserModalOpen ? (
    <UnifiedUserModal
      isOpen
      onOpenChange={setIsUserModalOpen}
      mode="profile"
      user={fullUserData || sessionUser}
      onSave={onSaveProfile}
    />
  ) : null;
}
