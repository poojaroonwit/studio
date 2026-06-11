import { useState } from "react";

import { applySidebarStyles } from "@/lib/themeUtils";
import {
  DEFAULT_SIDEBAR_COLORS_BASE,
  DEFAULT_SPLASH_ANIMATION_TYPE,
  DEFAULT_SPLASH_BACKGROUND_COLOR,
  createInitialSidebarColors,
  type SidebarBackgroundType,
  type SidebarColors,
  type SidebarImageFit,
  type SidebarImagePosition,
} from "@/components/settings/system-preferences/constants";

export function useSystemPreferenceSidebarSplashState() {
  const [sidebarColors, setSidebarColors] = useState<SidebarColors>(DEFAULT_SIDEBAR_COLORS_BASE);
  const [sidebarBackgroundType, setSidebarBackgroundType] = useState<SidebarBackgroundType>("gradient");
  const [selectedSidebarImageFile, setSelectedSidebarImageFile] = useState<File | null>(null);
  const [sidebarImagePreviewUrl, setSidebarImagePreviewUrl] = useState<string | null>(null);
  const [savedSidebarImageUrl, setSavedSidebarImageUrl] = useState<string | null>(null);
  const [sidebarImageFit, setSidebarImageFit] = useState<SidebarImageFit>("cover");
  const [sidebarImagePosition, setSidebarImagePosition] = useState<SidebarImagePosition>("center");

  const [splashBackgroundColor, setSplashBackgroundColor] = useState<string>(DEFAULT_SPLASH_BACKGROUND_COLOR);
  const [splashAnimationType, setSplashAnimationType] = useState<string>(DEFAULT_SPLASH_ANIMATION_TYPE);
  const [selectedSplashLogoFile, setSelectedSplashLogoFile] = useState<File | null>(null);
  const [splashLogoPreviewUrl, setSplashLogoPreviewUrl] = useState<string | null>(null);
  const [savedSplashLogoDataUrl, setSavedSplashLogoDataUrl] = useState<string | null>(null);

  const resetSidebarColors = () => {
    const newSidebarColors = createInitialSidebarColors();
    setSidebarColors(newSidebarColors);
    applySidebarStyles(newSidebarColors);
  };

  return {
    sidebarColors,
    setSidebarColors,
    sidebarBackgroundType,
    setSidebarBackgroundType,
    selectedSidebarImageFile,
    setSelectedSidebarImageFile,
    sidebarImagePreviewUrl,
    setSidebarImagePreviewUrl,
    savedSidebarImageUrl,
    setSavedSidebarImageUrl,
    sidebarImageFit,
    setSidebarImageFit,
    sidebarImagePosition,
    setSidebarImagePosition,
    splashBackgroundColor,
    setSplashBackgroundColor,
    splashAnimationType,
    setSplashAnimationType,
    selectedSplashLogoFile,
    setSelectedSplashLogoFile,
    splashLogoPreviewUrl,
    setSplashLogoPreviewUrl,
    savedSplashLogoDataUrl,
    setSavedSplashLogoDataUrl,
    resetSidebarColors,
    loadedPreferenceStateSetters: {
      setSidebarColors,
      setSidebarBackgroundType,
      setSavedSidebarImageUrl,
      setSidebarImagePreviewUrl,
      setSidebarImageFit,
      setSidebarImagePosition,
      setSplashBackgroundColor,
      setSplashAnimationType,
      setSavedSplashLogoDataUrl,
      setSplashLogoPreviewUrl,
    },
  };
}
