import type { ComponentType } from "react";
import type {
  HeaderPreviewUserSummary,
  HeaderUserSummary,
} from "./HeaderUserMenu.types";
import type { HeaderUserMenuLabels } from "./header-user-menu-i18n";

export interface HeaderMobileUserDrawerProps {
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
  onUserSearch: (query: string) => void;
  onStartImpersonation: (userId: string | null, role: string | null) => void;
}

export type MobileThemeOption = {
  id: "light" | "dark" | "system";
  label: string;
  icon: ComponentType<{ className?: string }>;
};
