"use client";

import Link from "next/link";
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
import { HeaderBrandLockup } from "./HeaderBrandLockup";
import { HeaderProfileModals } from "./HeaderProfileModals";
import { HeaderPrimaryNavigation } from "./HeaderPrimaryNavigation";
import type { HeaderProps, HeaderUserMenuSharedProps } from "./HeaderTypes";
import {
  isHeaderHiddenOnMobileDetail,
} from "./header-utils";
import { useHeaderBranding } from "./use-header-branding";
import { useHeaderUserActions } from "./use-header-user-actions";
import { useHeaderUserMenuLabels } from "./use-header-user-menu-labels";
import { useHeaderLocale } from "./use-header-locale";
import { useLocalization } from '@/contexts/LocalizationContext';
import { isAdminUser } from '@/lib/permissions';

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
  const { t } = useLocalization();
  const userMenuLabels = useHeaderUserMenuLabels();
  const { currentLocale, changeLocale } = useHeaderLocale();
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
  const isAdminPreviewEnabled = isAdminUser(userActions.user) || Boolean(session?.user?.adminId);

  useEffect(() => {
    if (typeof window === "undefined" || !supportsHeaderSearch) {
      return;
    }

    const handleHeaderSearchShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        if (document.documentElement.dataset.keyboardShortcuts === "false") return;
        event.preventDefault();
        window.dispatchEvent(new Event("header-search:open"));
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
      labels: userMenuLabels,
      user: userActions.user,
      refreshAvatar: refreshKey > 0,
      currentTheme,
      currentLocale,
      isAdminPreviewEnabled,
      previewUsers: userActions.previewUsers,
      isSearchingUsers: userActions.isSearchingUsers,
      onOpenProfile: userActions.handleOpenProfileModal,
      onOpenSecurity: () => userActions.setIsChangePasswordModalOpen(true),
      onClearCache: userActions.handleClearCache,
      onLocaleChange: changeLocale,
      onSignOut: userActions.handleSignOut,
      onUserSearch: userActions.handleUserSearch,
      onStartImpersonation: userActions.handleStartImpersonation,
    }
    : null;

  return (
    <>
      <header
        className={cn(
          "sticky z-50 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 bg-clip-padding bg-cover bg-center px-3 text-slate-700 shadow-none backdrop-blur-xl transition-[background-color,border-color] duration-300 supports-[backdrop-filter]:bg-white/90 sm:px-4 lg:px-8 dark:border-zinc-800 dark:bg-zinc-950/95 dark:text-zinc-100",
          (session?.user?.impersonatedUserId || session?.user?.impersonatedRole) ? "top-8" : "top-0"
        )}
      >
        {isMobile ? (
          <HeaderBrandSection
            currentAppName={currentAppName}
            appLogoUrl={appLogoUrl}
            showLogoOnly={showLogoOnly}
            isMobile={isMobile}
            pageTitle={initialPageTitle}
            pathname={pathname}
            onLogoClick={() => router.push("/")}
            onMobileBack={() => router.back()}
          />
        ) : (
          <div className="flex min-w-0 items-center gap-4 xl:gap-6">
            <Link
              href="/dashboard"
              aria-label={`${currentAppName} — ${initialPageTitle}`}
              className="flex h-11 min-w-0 shrink-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <HeaderBrandLockup
                appLogoUrl={appLogoUrl}
                currentAppName={currentAppName}
              />
            </Link>
            <HeaderPrimaryNavigation pathname={pathname || ''} />
          </div>
        )}

        <HeaderActionsSection
          headerSearchLabel={t("layout.searchEverything", "Search everything")}
          isLoading={isLoading}
          isMobile={isMobile}
          pathname={pathname}
          supportsHeaderSearch={supportsHeaderSearch}
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
