import type { HeaderPreviewUserSummary, HeaderUserSummary } from "./HeaderUserMenu.types";
import type { AppLayoutContextualLogos } from "./app-layout-settings";

export interface HeaderProps {
  pageTitle: string;
  showLogoOnly?: boolean;
  appLogoUrl?: string | null;
  currentAppName?: string;
  contextualLogos?: Partial<AppLayoutContextualLogos>;
  isLogoLoading?: boolean;
}

export interface HeaderUserMenuSharedProps {
  user: HeaderUserSummary;
  refreshAvatar: boolean;
  currentTheme: string;
  isAdminPreviewEnabled: boolean;
  previewUsers: HeaderPreviewUserSummary[];
  isSearchingUsers: boolean;
  onOpenProfile: () => void;
  onOpenSecurity: () => void;
  onOpenSettings: () => void;
  onClearCache: () => void;
  onSignOut: () => void;
  onUserSearch: (query: string) => Promise<void>;
  onStartImpersonation: (userId: string | null, role: string | null) => Promise<void>;
}
