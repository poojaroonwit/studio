"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import type { UnifiedUserFormValues } from "@/components/users/UnifiedUserModal";
import { useAvatarRefresh } from "@/hooks/use-avatar-refresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";

import { HeaderActionsSection } from "./HeaderActionsSection";
import { HeaderBrandSection } from "./HeaderBrandSection";
import { HeaderProfileModals } from "./HeaderProfileModals";
import type { HeaderProps, HeaderUserMenuSharedProps } from "./HeaderTypes";
import {
  isHeaderHiddenOnMobileDetail,
} from "./header-utils";
import { useHeaderBranding } from "./use-header-branding";
import { useHeaderUserActions } from "./use-header-user-actions";

export function Header({
  pageTitle: initialPageTitle,
  showLogoOnly = false,
  appLogoUrl: propLogoUrl,
  currentAppName: propAppName,
}: HeaderProps) {
  const isMobile = useIsMobile();
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { refreshKey, forceRefresh } = useAvatarRefresh();
  const { currentTheme } = useTheme();
  const {
    mounted,
    currentAppName,
    appLogoUrl,
  } = useHeaderBranding({
    initialPageTitle,
    propAppName,
    propLogoUrl,
    isMobile,
  });
  const userActions = useHeaderUserActions({
    session,
    updateSession,
    forceRefresh,
  });

  const isLoading = !mounted || status === "loading";
  const supportsHeaderSearch = !pathname?.startsWith("/auth/");
  const isDetailPage = useMemo(() => isHeaderHiddenOnMobileDetail(pathname), [pathname]);
  const isAdminPreviewEnabled = userActions.user?.role === "Admin" || Boolean(session?.user?.adminId);

  useEffect(() => {
    if (typeof window === "undefined" || !supportsHeaderSearch) {
      return;
    }

    const handleHeaderSearchShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("header-search-input")?.focus();
      }
    };

    window.addEventListener("keydown", handleHeaderSearchShortcut);
    return () => window.removeEventListener("keydown", handleHeaderSearchShortcut);
  }, [supportsHeaderSearch]);

  if (isMobile && isDetailPage) {
    return null;
  }

  const userMenuProps: HeaderUserMenuSharedProps | null = userActions.user
    ? {
      user: userActions.user,
      refreshAvatar: refreshKey > 0,
      currentTheme,
      isAdminPreviewEnabled,
      previewUsers: userActions.previewUsers,
      isSearchingUsers: userActions.isSearchingUsers,
      onOpenProfile: userActions.handleOpenProfileModal,
      onOpenSecurity: () => userActions.setIsChangePasswordModalOpen(true),
      onOpenSettings: () => router.push("/settings"),
      onClearCache: userActions.handleClearCache,
      onSignOut: userActions.handleSignOut,
      onUserSearch: userActions.handleUserSearch,
      onStartImpersonation: userActions.handleStartImpersonation,
    }
    : null;

  return (
    <>
      <header
        className={cn(
          "sticky z-50 h-16 shrink-0 border-b border-black/5 dark:border-white/10 bg-white/80 dark:bg-zinc-950/70 bg-clip-padding bg-cover bg-center px-4 lg:px-8 flex items-center justify-between shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl backdrop-saturate-150 transition-[background-color,box-shadow,border-color] duration-300 supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-zinc-950/55",
          (session?.user?.impersonatedUserId || session?.user?.impersonatedRole) ? "top-8" : "top-0"
        )}
        style={{
          backgroundColor: "var(--header-surface)",
          backgroundImage: "var(--header-background-image, none)",
          color: "var(--header-foreground)",
        }}
      >
        <HeaderBrandSection
          currentAppName={currentAppName}
          appLogoUrl={appLogoUrl}
          showLogoOnly={showLogoOnly}
          isMobile={isMobile}
          pathname={pathname}
          supportsHeaderSearch={supportsHeaderSearch}
          headerSearchLabel="Search everything"
          onLogoClick={() => router.push("/")}
          onMobileBack={() => router.back()}
        />

        <HeaderActionsSection
          isLoading={isLoading}
          isMobile={isMobile}
          pathname={pathname}
          userMenuProps={userMenuProps}
        />
      </header>

      <HeaderProfileModals
        user={userActions.user}
        isChangePasswordModalOpen={userActions.isChangePasswordModalOpen}
        setIsChangePasswordModalOpen={userActions.setIsChangePasswordModalOpen}
        isUserModalOpen={userActions.isUserModalOpen}
        setIsUserModalOpen={userActions.setIsUserModalOpen}
        fullUserData={userActions.fullUserData}
        sessionUser={(session?.user as UserProfile | undefined) ?? null}
        onSaveProfile={userActions.handleEditProfile as (data: UnifiedUserFormValues) => Promise<void>}
      />
    </>
  );
}
