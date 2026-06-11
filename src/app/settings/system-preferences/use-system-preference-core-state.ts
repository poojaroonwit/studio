import { useState } from "react";

import type { SystemPreferencesTabId } from "@/components/settings/system-preferences/SystemPreferencesNavigation";
import {
  DEFAULT_APP_NAME,
  DEFAULT_DRAWER_STYLE,
  DEFAULT_LOGIN_PAGE_LOGO_SIZE,
  type DrawerStyle,
  type ThemePreference,
} from "@/components/settings/system-preferences/constants";

const DEFAULT_THEME: ThemePreference = "system";

export function useSystemPreferenceCoreState() {
  const [isClient, setIsClient] = useState(false);
  const [showLogoOnly, setShowLogoOnly] = useState<boolean>(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>(DEFAULT_THEME);
  const [appName, setAppName] = useState<string>(DEFAULT_APP_NAME);
  const [activeTab, setActiveTab] = useState<SystemPreferencesTabId>("general");
  const [activeSidebarTab, setActiveSidebarTab] = useState("light");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generativeAICanvasMode, setGenerativeAICanvasMode] = useState<boolean>(false);
  const [drawerStyle, setDrawerStyle] = useState<DrawerStyle>(DEFAULT_DRAWER_STYLE);
  const [loginPageLogoSize, setLoginPageLogoSize] = useState<number>(DEFAULT_LOGIN_PAGE_LOGO_SIZE);

  return {
    isClient,
    setIsClient,
    showLogoOnly,
    setShowLogoOnly,
    themePreference,
    setThemePreference,
    appName,
    setAppName,
    activeTab,
    setActiveTab,
    activeSidebarTab,
    setActiveSidebarTab,
    loading,
    setLoading,
    saving,
    setSaving,
    errorMsg,
    setErrorMsg,
    generativeAICanvasMode,
    setGenerativeAICanvasMode,
    drawerStyle,
    setDrawerStyle,
    loginPageLogoSize,
    setLoginPageLogoSize,
    loadedPreferenceStateSetters: {
      setThemePreference,
      setAppName,
      setShowLogoOnly,
      setLoginPageLogoSize,
      setGenerativeAICanvasMode,
      setDrawerStyle,
    },
  };
}
