"use client";

import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";
import { UnifiedUserModal } from "@/components/users/UnifiedUserModal";
import type { UnifiedUserFormValues } from "@/components/users/UnifiedUserModal";
import type { UserProfile } from "@/lib/types";

import type { HeaderUserSummary } from "./HeaderUserMenu.types";

interface HeaderProfileModalsProps {
  user: HeaderUserSummary | null;
  isChangePasswordModalOpen: boolean;
  setIsChangePasswordModalOpen: (open: boolean) => void;
  isUserModalOpen: boolean;
  setIsUserModalOpen: (open: boolean) => void;
  fullUserData: UserProfile | null;
  sessionUser: UserProfile | null;
  onSaveProfile: (data: UnifiedUserFormValues) => Promise<void>;
}

export function HeaderProfileModals({
  user,
  isChangePasswordModalOpen,
  setIsChangePasswordModalOpen,
  isUserModalOpen,
  setIsUserModalOpen,
  fullUserData,
  sessionUser,
  onSaveProfile,
}: HeaderProfileModalsProps) {
  if (!user) {
    return null;
  }

  return (
    <>
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onOpenChange={setIsChangePasswordModalOpen}
      />
      <UnifiedUserModal
        isOpen={isUserModalOpen}
        onOpenChange={setIsUserModalOpen}
        mode="profile"
        user={fullUserData || sessionUser}
        onSave={onSaveProfile}
      />
    </>
  );
}
