import type { HeaderPreviewUserSummary, HeaderUserSummary } from "./HeaderUserMenu.types";
import type { AppLayoutContextualLogos } from "./app-layout-settings";
import type { HeaderUserMenuLabels } from "./header-user-menu-i18n";

export interface HeaderProps {
  pageTitle: string;
  showLogoOnly?: boolean;
  appLogoUrl?: string | null;
  currentAppName?: string;
  contextualLogos?: Partial<AppLayoutContextualLogos>;
  isLogoLoading?: boolean;
}

export interface HeaderUserMenuSharedProps {
  labels: HeaderUserMenuLabels;
  user: HeaderUserSummary;
  refreshAvatar: boolean;
  currentTheme: string;
  currentLocale: "en-US" | "th-TH";
  isAdminPreviewEnabled: boolean;
  previewUsers: HeaderPreviewUserSummary[];
  isSearchingUsers: boolean;
  onOpenProfile: () => void;
  onOpenSecurity: () => void;
  onOpenSettings: () => void;
  onClearCache: () => void;
  onLocaleChange: (locale: "en-US" | "th-TH") => void;
  onSignOut: () => void;
  onUserSearch: (query: string) => Promise<void>;
  onStartImpersonation: (userId: string | null, role: string | null) => Promise<void>;
}
