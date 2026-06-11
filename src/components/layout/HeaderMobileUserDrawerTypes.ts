import type { ComponentType } from "react";
import type {
  HeaderPreviewUserSummary,
  HeaderUserSummary,
} from "./HeaderUserMenu.types";

export interface HeaderMobileUserDrawerProps {
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
  onUserSearch: (query: string) => void;
  onStartImpersonation: (userId: string | null, role: string | null) => void;
}

export type MobileThemeOption = {
  id: "light" | "dark" | "system";
  label: string;
  icon: ComponentType<{ className?: string }>;
};
