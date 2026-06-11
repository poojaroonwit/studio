"use client";

import { useEffect, type MutableRefObject } from "react";

import {
  applyHeaderBrandingSettings,
  applySidebarBackgroundSettings,
  applySidebarStyles,
} from "@/lib/themeUtils";
import type {
  HeaderBackgroundType,
  SidebarBackgroundType,
  SidebarColors,
  SidebarImageFit,
  SidebarImagePosition,
} from "@/components/settings/system-preferences/constants";

export interface UseSystemPreferenceStyleEffectsOptions {
  isMountedRef: MutableRefObject<boolean>;
  sidebarColors: SidebarColors;
  sidebarBackgroundType: SidebarBackgroundType;
  savedSidebarImageUrl: string | null;
  sidebarImageFit: SidebarImageFit;
  sidebarImagePosition: SidebarImagePosition;
  headerBackgroundType: HeaderBackgroundType;
  headerBackgroundColor: string;
  headerBackgroundGradient: string | null;
  headerImagePreviewUrl: string | null;
  headerTextColor: string;
}

export function useSystemPreferenceStyleEffects({
  isMountedRef,
  sidebarColors,
  sidebarBackgroundType,
  savedSidebarImageUrl,
  sidebarImageFit,
  sidebarImagePosition,
  headerBackgroundType,
  headerBackgroundColor,
  headerBackgroundGradient,
  headerImagePreviewUrl,
  headerTextColor,
}: UseSystemPreferenceStyleEffectsOptions) {
  useEffect(() => {
    if (isMountedRef.current) {
      applySidebarStyles(sidebarColors);
    }
  }, [isMountedRef, sidebarColors]);

  useEffect(() => {
    if (!isMountedRef.current) return;

    try {
      applySidebarBackgroundSettings({
        sidebarBackgroundType,
        sidebarBackgroundImageUrl: savedSidebarImageUrl || undefined,
        sidebarBackgroundImageFit: sidebarImageFit,
        sidebarBackgroundImagePosition: sidebarImagePosition,
      });

      window.dispatchEvent(new CustomEvent("appConfigChanged", {
        detail: {
          sidebarBackgroundType,
          sidebarBackgroundImageUrl: savedSidebarImageUrl || null,
        },
      }));
    } catch (error) {
      console.warn("Failed to apply sidebar background settings", error);
    }
  }, [isMountedRef, sidebarBackgroundType, savedSidebarImageUrl, sidebarImageFit, sidebarImagePosition]);

  useEffect(() => {
    if (!isMountedRef.current) return;

    try {
      applyHeaderBrandingSettings({
        headerBackgroundType: headerBackgroundType ?? undefined,
        headerBackgroundColor: headerBackgroundColor ?? undefined,
        headerBackgroundGradient: headerBackgroundGradient ?? undefined,
        headerBackgroundImageUrl: headerImagePreviewUrl ?? undefined,
        headerTextColor: headerTextColor ?? undefined,
      });
    } catch (error) {
      console.warn("Failed to apply header branding settings", error);
    }
  }, [
    isMountedRef,
    headerBackgroundType,
    headerBackgroundColor,
    headerBackgroundGradient,
    headerImagePreviewUrl,
    headerTextColor,
  ]);
}
