"use client";

import React, { useEffect, useState, type ChangeEvent } from "react";
import { Loader2, Save, X, Palette, ImageUp, Trash2, XCircle, PenSquare, Sun, Moon, RotateCcw, Sidebar as SidebarIcon, LogIn, Settings2, Type } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { setThemeAndColors, applySidebarStyles, getSidebarActiveStyle, setSidebarActiveStyle, type SidebarActiveStyle } from "@/lib/themeUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';

const DEFAULT_APP_NAME = "CV-Screening";
const DEFAULT_THEME: ThemePreference = "system";

// Backend keys
const APP_THEME_KEY = 'appThemePreference';
const APP_LOGO_DATA_URL_KEY = 'appLogoDataUrl';
const APP_FAVICON_DATA_URL_KEY = 'appFaviconDataUrl';
const APP_NAME_KEY = 'appName';
const APP_CONFIG_APP_NAME_KEY = 'appConfigAppName';

// Login page design keys/types/utilities
const LOGIN_BACKGROUND_TYPE_KEY = 'loginBackgroundType';
const LOGIN_BACKGROUND_IMAGE_KEY = 'loginPageBackgroundImageUrl';
const LOGIN_BACKGROUND_GRADIENT_START_KEY = 'loginBackgroundGradientStart';
const LOGIN_BACKGROUND_GRADIENT_END_KEY = 'loginBackgroundGradientEnd';
const LOGIN_BACKGROUND_COLOR_KEY = 'loginBackgroundColor';

type ThemePreference = "light" | "dark" | "system";
type LoginBackgroundType = 'image' | 'gradient' | 'solid';

// --- Sidebar color keys/types/utilities ---
const DEFAULT_PRIMARY_GRADIENT_START = "179 67% 66%";
const DEFAULT_PRIMARY_GRADIENT_END = "238 74% 61%";
const DEFAULT_SIDEBAR_COLORS_BASE = {
  // Background colors
  sidebarBgStartL: "220 25% 97%", sidebarBgEndL: "220 20% 94%", sidebarTextL: "220 25% 30%",
  sidebarActiveBgStartL: DEFAULT_PRIMARY_GRADIENT_START, sidebarActiveBgEndL: DEFAULT_PRIMARY_GRADIENT_END, sidebarActiveTextL: "0 0% 100%",      
  sidebarHoverBgL: "220 10% 92%", sidebarHoverTextL: "220 25% 25%", sidebarBorderL: "220 15% 85%",
  sidebarBgStartD: "220 15% 12%", sidebarBgEndD: "220 15% 9%", sidebarTextD: "210 30% 85%",
  sidebarActiveBgStartD: DEFAULT_PRIMARY_GRADIENT_START, sidebarActiveBgEndD: DEFAULT_PRIMARY_GRADIENT_END, sidebarActiveTextD: "0 0% 100%",      
  sidebarHoverBgD: "220 15% 20%", sidebarHoverTextD: "210 30% 90%", sidebarBorderD: "220 15% 18%",
  
  // Font settings
  sidebarFontFamilyL: "inherit", sidebarFontSizeL: "0.875rem", sidebarFontWeightL: "400",
  sidebarLineHeightL: "1.25rem", sidebarLetterSpacingL: "0", sidebarTextTransformL: "none",
  sidebarFontFamilyD: "inherit", sidebarFontSizeD: "0.875rem", sidebarFontWeightD: "400",
  sidebarLineHeightD: "1.25rem", sidebarLetterSpacingD: "0", sidebarTextTransformD: "none",
  
  // Border and shadow settings
  sidebarBorderWidthL: "1px", sidebarBorderStyleL: "solid", sidebarBorderRadiusL: "0.5rem",
  sidebarShadowL: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  sidebarShadowHoverL: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  sidebarShadowActiveL: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  sidebarBorderWidthD: "1px", sidebarBorderStyleD: "solid", sidebarBorderRadiusD: "0.5rem",
  sidebarShadowD: "0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)",
  sidebarShadowHoverD: "0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)",
  sidebarShadowActiveD: "0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)",
  
  // Spacing and layout
  sidebarPaddingXL: "0.75rem", sidebarPaddingYL: "0.5rem", sidebarMarginL: "0.25rem", sidebarGapL: "0.5rem",
  sidebarWidthL: "16rem", sidebarWidthCollapsedL: "3rem", sidebarTransitionDurationL: "0.2s", sidebarTransitionTimingL: "ease-in-out",
  sidebarPaddingXD: "0.75rem", sidebarPaddingYD: "0.5rem", sidebarMarginD: "0.25rem", sidebarGapD: "0.5rem",
  sidebarWidthD: "16rem", sidebarWidthCollapsedD: "3rem", sidebarTransitionDurationD: "0.2s", sidebarTransitionTimingD: "ease-in-out",
  
  // Menu item specific settings
  sidebarMenuItemBgL: "transparent", sidebarMenuItemBgHoverL: "220 10% 92%", sidebarMenuItemBgActiveL: "179 67% 66%",
  sidebarMenuItemColorL: "220 25% 30%", sidebarMenuItemColorHoverL: "220 25% 25%", sidebarMenuItemColorActiveL: "0 0% 100%",
  sidebarMenuItemBorderL: "transparent", sidebarMenuItemBorderHoverL: "transparent", sidebarMenuItemBorderActiveL: "transparent",
  sidebarMenuItemBorderRadiusL: "0.375rem", sidebarMenuItemPaddingXL: "0.75rem", sidebarMenuItemPaddingYL: "0.5rem",
  sidebarMenuItemMarginL: "0.125rem", sidebarMenuItemFontWeightL: "400", sidebarMenuItemFontWeightActiveL: "600",
  sidebarMenuItemFontSizeL: "0.875rem", sidebarMenuItemLineHeightL: "1.25rem", sidebarMenuItemTransitionL: "all 0.2s ease-in-out",
  sidebarMenuItemBgD: "transparent", sidebarMenuItemBgHoverD: "220 15% 20%", sidebarMenuItemBgActiveD: "179 67% 66%",
  sidebarMenuItemColorD: "210 30% 85%", sidebarMenuItemColorHoverD: "210 30% 90%", sidebarMenuItemColorActiveD: "0 0% 100%",
  sidebarMenuItemBorderD: "transparent", sidebarMenuItemBorderHoverD: "transparent", sidebarMenuItemBorderActiveD: "transparent",
  sidebarMenuItemBorderRadiusD: "0.375rem", sidebarMenuItemPaddingXD: "0.75rem", sidebarMenuItemPaddingYD: "0.5rem",
  sidebarMenuItemMarginD: "0.125rem", sidebarMenuItemFontWeightD: "400", sidebarMenuItemFontWeightActiveD: "600",
  sidebarMenuItemFontSizeD: "0.875rem", sidebarMenuItemLineHeightD: "1.25rem", sidebarMenuItemTransitionD: "all 0.2s ease-in-out",
  
  // Icon settings
  sidebarIconSizeL: "1.25rem", sidebarIconColorL: "220 25% 30%", sidebarIconColorHoverL: "220 25% 25%", sidebarIconColorActiveL: "0 0% 100%",
  sidebarIconMarginRightL: "0.75rem", sidebarIconTransitionL: "color 0.2s ease-in-out",
  sidebarIconSizeD: "1.25rem", sidebarIconColorD: "210 30% 85%", sidebarIconColorHoverD: "210 30% 90%", sidebarIconColorActiveD: "0 0% 100%",
  sidebarIconMarginRightD: "0.75rem", sidebarIconTransitionD: "color 0.2s ease-in-out",
  
  // Group label settings
  sidebarGroupLabelColorL: "220 15% 50%", sidebarGroupLabelFontSizeL: "0.75rem", sidebarGroupLabelFontWeightL: "500",
  sidebarGroupLabelTextTransformL: "uppercase", sidebarGroupLabelLetterSpacingL: "0.05em", sidebarGroupLabelPaddingL: "0.5rem 0.75rem", sidebarGroupLabelMarginL: "0.5rem 0",
  sidebarGroupLabelColorD: "210 25% 70%", sidebarGroupLabelFontSizeD: "0.75rem", sidebarGroupLabelFontWeightD: "500",
  sidebarGroupLabelTextTransformD: "uppercase", sidebarGroupLabelLetterSpacingD: "0.05em", sidebarGroupLabelPaddingD: "0.5rem 0.75rem", sidebarGroupLabelMarginD: "0.5rem 0",
};

const SIDEBAR_COLOR_KEYS = [
  // Background colors
  'sidebarBgStartL', 'sidebarBgEndL', 'sidebarTextL',
  'sidebarActiveBgStartL', 'sidebarActiveBgEndL', 'sidebarActiveTextL',
  'sidebarHoverBgL', 'sidebarHoverTextL', 'sidebarBorderL',
  'sidebarBgStartD', 'sidebarBgEndD', 'sidebarTextD',
  'sidebarActiveBgStartD', 'sidebarActiveBgEndD', 'sidebarActiveTextD',
  'sidebarHoverBgD', 'sidebarHoverTextD', 'sidebarBorderD',
  
  // Font settings
  'sidebarFontFamilyL', 'sidebarFontSizeL', 'sidebarFontWeightL', 'sidebarLineHeightL', 'sidebarLetterSpacingL', 'sidebarTextTransformL',
  'sidebarFontFamilyD', 'sidebarFontSizeD', 'sidebarFontWeightD', 'sidebarLineHeightD', 'sidebarLetterSpacingD', 'sidebarTextTransformD',
  
  // Border and shadow settings
  'sidebarBorderWidthL', 'sidebarBorderStyleL', 'sidebarBorderRadiusL', 'sidebarShadowL', 'sidebarShadowHoverL', 'sidebarShadowActiveL',
  'sidebarBorderWidthD', 'sidebarBorderStyleD', 'sidebarBorderRadiusD', 'sidebarShadowD', 'sidebarShadowHoverD', 'sidebarShadowActiveD',
  
  // Spacing and layout
  'sidebarPaddingXL', 'sidebarPaddingYL', 'sidebarMarginL', 'sidebarGapL', 'sidebarWidthL', 'sidebarWidthCollapsedL', 'sidebarTransitionDurationL', 'sidebarTransitionTimingL',
  'sidebarPaddingXD', 'sidebarPaddingYD', 'sidebarMarginD', 'sidebarGapD', 'sidebarWidthD', 'sidebarWidthCollapsedD', 'sidebarTransitionDurationD', 'sidebarTransitionTimingD',
  
  // Menu item specific settings
  'sidebarMenuItemBgL', 'sidebarMenuItemBgHoverL', 'sidebarMenuItemBgActiveL', 'sidebarMenuItemColorL', 'sidebarMenuItemColorHoverL', 'sidebarMenuItemColorActiveL',
  'sidebarMenuItemBorderL', 'sidebarMenuItemBorderHoverL', 'sidebarMenuItemBorderActiveL', 'sidebarMenuItemBorderRadiusL', 'sidebarMenuItemPaddingXL', 'sidebarMenuItemPaddingYL',
  'sidebarMenuItemMarginL', 'sidebarMenuItemFontWeightL', 'sidebarMenuItemFontWeightActiveL', 'sidebarMenuItemFontSizeL', 'sidebarMenuItemLineHeightL', 'sidebarMenuItemTransitionL',
  'sidebarMenuItemBgD', 'sidebarMenuItemBgHoverD', 'sidebarMenuItemBgActiveD', 'sidebarMenuItemColorD', 'sidebarMenuItemColorHoverD', 'sidebarMenuItemColorActiveD',
  'sidebarMenuItemBorderD', 'sidebarMenuItemBorderHoverD', 'sidebarMenuItemBorderActiveD', 'sidebarMenuItemBorderRadiusD', 'sidebarMenuItemPaddingXD', 'sidebarMenuItemPaddingYD',
  'sidebarMenuItemMarginD', 'sidebarMenuItemFontWeightD', 'sidebarMenuItemFontWeightActiveD', 'sidebarMenuItemFontSizeD', 'sidebarMenuItemLineHeightD', 'sidebarMenuItemTransitionD',
  
  // Icon settings
  'sidebarIconSizeL', 'sidebarIconColorL', 'sidebarIconColorHoverL', 'sidebarIconColorActiveL', 'sidebarIconMarginRightL', 'sidebarIconTransitionL',
  'sidebarIconSizeD', 'sidebarIconColorD', 'sidebarIconColorHoverD', 'sidebarIconColorActiveD', 'sidebarIconMarginRightD', 'sidebarIconTransitionD',
  
  // Group label settings
  'sidebarGroupLabelColorL', 'sidebarGroupLabelFontSizeL', 'sidebarGroupLabelFontWeightL', 'sidebarGroupLabelTextTransformL', 'sidebarGroupLabelLetterSpacingL', 'sidebarGroupLabelPaddingL', 'sidebarGroupLabelMarginL',
  'sidebarGroupLabelColorD', 'sidebarGroupLabelFontSizeD', 'sidebarGroupLabelFontWeightD', 'sidebarGroupLabelTextTransformD', 'sidebarGroupLabelLetterSpacingD', 'sidebarGroupLabelPaddingD', 'sidebarGroupLabelMarginD',
];

function parseHslString(hslString: string): { h: number; s: number; l: number } | null {
  const match = hslString?.match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!match) return null;
  return {
    h: parseFloat(match[1]),
    s: parseFloat(match[2]) / 100,
    l: parseFloat(match[3]) / 100,
  };
}
function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
function hexToHslString(hex: string): string {
  let r = 0, g = 0, b = 0;
  if (hex.startsWith('#')) hex = hex.substring(1);
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else { return "0 0% 0%"; } 
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  const lPercent = Math.round(l * 100);
  return `${h} ${s}% ${lPercent}%`;
}
function convertHslStringToHex(hslString: string | null | undefined): string {
  if (!hslString) return '#000000';
  const hslObj = parseHslString(hslString);
  if (!hslObj) return '#000000';
  return hslToHex(hslObj.h, hslObj.s, hslObj.l);
}

interface SidebarColors {
  // Background colors
  sidebarBgStartL: string; sidebarBgEndL: string; sidebarTextL: string;
  sidebarActiveBgStartL: string; sidebarActiveBgEndL: string; sidebarActiveTextL: string;
  sidebarHoverBgL: string; sidebarHoverTextL: string; sidebarBorderL: string;
  sidebarBgStartD: string; sidebarBgEndD: string; sidebarTextD: string;
  sidebarActiveBgStartD: string; sidebarActiveBgEndD: string; 
  sidebarActiveTextD: string;
  sidebarHoverBgD: string; sidebarHoverTextD: string; sidebarBorderD: string;
  
  // Font settings
  sidebarFontFamilyL: string; sidebarFontSizeL: string; sidebarFontWeightL: string;
  sidebarLineHeightL: string; sidebarLetterSpacingL: string; sidebarTextTransformL: string;
  sidebarFontFamilyD: string; sidebarFontSizeD: string; sidebarFontWeightD: string;
  sidebarLineHeightD: string; sidebarLetterSpacingD: string; sidebarTextTransformD: string;
  
  // Border and shadow settings
  sidebarBorderWidthL: string; sidebarBorderStyleL: string; sidebarBorderRadiusL: string;
  sidebarShadowL: string; sidebarShadowHoverL: string; sidebarShadowActiveL: string;
  sidebarBorderWidthD: string; sidebarBorderStyleD: string; sidebarBorderRadiusD: string;
  sidebarShadowD: string; sidebarShadowHoverD: string; sidebarShadowActiveD: string;
  
  // Spacing and layout
  sidebarPaddingXL: string; sidebarPaddingYL: string; sidebarMarginL: string; sidebarGapL: string;
  sidebarWidthL: string; sidebarWidthCollapsedL: string; sidebarTransitionDurationL: string; sidebarTransitionTimingL: string;
  sidebarPaddingXD: string; sidebarPaddingYD: string; sidebarMarginD: string; sidebarGapD: string;
  sidebarWidthD: string; sidebarWidthCollapsedD: string; sidebarTransitionDurationD: string; sidebarTransitionTimingD: string;
  
  // Menu item specific settings
  sidebarMenuItemBgL: string; sidebarMenuItemBgHoverL: string; sidebarMenuItemBgActiveL: string;
  sidebarMenuItemColorL: string; sidebarMenuItemColorHoverL: string; sidebarMenuItemColorActiveL: string;
  sidebarMenuItemBorderL: string; sidebarMenuItemBorderHoverL: string; sidebarMenuItemBorderActiveL: string;
  sidebarMenuItemBorderRadiusL: string; sidebarMenuItemPaddingXL: string; sidebarMenuItemPaddingYL: string;
  sidebarMenuItemMarginL: string; sidebarMenuItemFontWeightL: string; sidebarMenuItemFontWeightActiveL: string;
  sidebarMenuItemFontSizeL: string; sidebarMenuItemLineHeightL: string; sidebarMenuItemTransitionL: string;
  sidebarMenuItemBgD: string; sidebarMenuItemBgHoverD: string; sidebarMenuItemBgActiveD: string;
  sidebarMenuItemColorD: string; sidebarMenuItemColorHoverD: string; sidebarMenuItemColorActiveD: string;
  sidebarMenuItemBorderD: string; sidebarMenuItemBorderHoverD: string; sidebarMenuItemBorderActiveD: string;
  sidebarMenuItemBorderRadiusD: string; sidebarMenuItemPaddingXD: string; sidebarMenuItemPaddingYD: string;
  sidebarMenuItemMarginD: string; sidebarMenuItemFontWeightD: string; sidebarMenuItemFontWeightActiveD: string;
  sidebarMenuItemFontSizeD: string; sidebarMenuItemLineHeightD: string; sidebarMenuItemTransitionD: string;
  
  // Icon settings
  sidebarIconSizeL: string; sidebarIconColorL: string; sidebarIconColorHoverL: string; sidebarIconColorActiveL: string;
  sidebarIconMarginRightL: string; sidebarIconTransitionL: string;
  sidebarIconSizeD: string; sidebarIconColorD: string; sidebarIconColorHoverD: string; sidebarIconColorActiveD: string;
  sidebarIconMarginRightD: string; sidebarIconTransitionD: string;
  
  // Group label settings
  sidebarGroupLabelColorL: string; sidebarGroupLabelFontSizeL: string; sidebarGroupLabelFontWeightL: string;
  sidebarGroupLabelTextTransformL: string; sidebarGroupLabelLetterSpacingL: string; sidebarGroupLabelPaddingL: string; sidebarGroupLabelMarginL: string;
  sidebarGroupLabelColorD: string; sidebarGroupLabelFontSizeD: string; sidebarGroupLabelFontWeightD: string;
  sidebarGroupLabelTextTransformD: string; sidebarGroupLabelLetterSpacingD: string; sidebarGroupLabelPaddingD: string; sidebarGroupLabelMarginD: string;
  
  [key: string]: string;
}


function createInitialSidebarColors() {
  return { ...DEFAULT_SIDEBAR_COLORS_BASE };
}
// --- End sidebar color utilities ---

// Login page design state
const DEFAULT_LOGIN_BACKGROUND_TYPE: LoginBackgroundType = 'gradient';
const DEFAULT_LOGIN_BACKGROUND_GRADIENT_START = '179 67% 66%';
const DEFAULT_LOGIN_BACKGROUND_GRADIENT_END = '238 74% 61%';
const DEFAULT_LOGIN_BACKGROUND_COLOR = '220 25% 97%';

export default function SystemPreferencesPage() {
  const { success, error } = useToast();
  const [isClient, setIsClient] = useState(false);
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Preferences state
  const [themePreference, setThemePreference] = useState<ThemePreference>(DEFAULT_THEME);
  const [appName, setAppName] = useState<string>(DEFAULT_APP_NAME);
  // App Logo state
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [savedLogoUrl, setSavedLogoUrl] = useState<string | null>(null);
  
  // New contextual logo states
  const [loginPageLogoLightModePreviewUrl, setLoginPageLogoLightModePreviewUrl] = useState<string | null>(null);
  const [savedLoginPageLogoLightModeUrl, setSavedLoginPageLogoLightModeUrl] = useState<string | null>(null);
  const [loginPageLogoDarkModePreviewUrl, setLoginPageLogoDarkModePreviewUrl] = useState<string | null>(null);
  const [savedLoginPageLogoDarkModeUrl, setSavedLoginPageLogoDarkModeUrl] = useState<string | null>(null);
  
  const [sidebarLogoCollapsedLightModePreviewUrl, setSidebarLogoCollapsedLightModePreviewUrl] = useState<string | null>(null);
  const [savedSidebarLogoCollapsedLightModeUrl, setSavedSidebarLogoCollapsedLightModeUrl] = useState<string | null>(null);
  const [sidebarLogoExpandedLightModePreviewUrl, setSidebarLogoExpandedLightModePreviewUrl] = useState<string | null>(null);
  const [savedSidebarLogoExpandedLightModeUrl, setSavedSidebarLogoExpandedLightModeUrl] = useState<string | null>(null);
  
  const [sidebarLogoCollapsedDarkModePreviewUrl, setSidebarLogoCollapsedDarkModePreviewUrl] = useState<string | null>(null);
  const [savedSidebarLogoCollapsedDarkModeUrl, setSavedSidebarLogoCollapsedDarkModeUrl] = useState<string | null>(null);
  const [sidebarLogoExpandedDarkModePreviewUrl, setSidebarLogoExpandedDarkModePreviewUrl] = useState<string | null>(null);
  const [savedSidebarLogoExpandedDarkModeUrl, setSavedSidebarLogoExpandedDarkModeUrl] = useState<string | null>(null);
  
  // App Favicon state
  const [selectedFaviconFile, setSelectedFaviconFile] = useState<File | null>(null);
  const [faviconPreviewUrl, setFaviconPreviewUrl] = useState<string | null>(null);
  const [savedFaviconUrl, setSavedFaviconUrl] = useState<string | null>(null);
  
  // Login page design state
  const [loginBackgroundType, setLoginBackgroundType] = useState<LoginBackgroundType>(DEFAULT_LOGIN_BACKGROUND_TYPE);
  const [selectedLoginImageFile, setSelectedLoginImageFile] = useState<File | null>(null);
  const [loginImagePreviewUrl, setLoginImagePreviewUrl] = useState<string | null>(null);
  const [savedLoginImageDataUrl, setSavedLoginImageDataUrl] = useState<string | null>(null);
  const [loginBackgroundGradientStart, setLoginBackgroundGradientStart] = useState<string>(DEFAULT_LOGIN_BACKGROUND_GRADIENT_START);
  const [loginBackgroundGradientEnd, setLoginBackgroundGradientEnd] = useState<string>(DEFAULT_LOGIN_BACKGROUND_GRADIENT_END);
  const [loginBackgroundColor, setLoginBackgroundColor] = useState<string>(DEFAULT_LOGIN_BACKGROUND_COLOR);
  
  // Loading/saving/error
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  // Sidebar color state
  const [sidebarColors, setSidebarColors] = useState<SidebarColors>(DEFAULT_SIDEBAR_COLORS_BASE);
  const [sidebarActiveStyle, setSidebarActiveStyle] = useState<SidebarActiveStyle>('gradient');
  const [appMenuIcon, setAppMenuIcon] = useState<string>("");
  const [appMenuIconType, setAppMenuIconType] = useState<"lucide"|"image">("lucide");

  // Add state for primary button color
  const [primaryGradientStart, setPrimaryGradientStart] = useState<string>(DEFAULT_PRIMARY_GRADIENT_START);
  const [primaryGradientEnd, setPrimaryGradientEnd] = useState<string>(DEFAULT_PRIMARY_GRADIENT_END);

  const canEdit =
    session?.user?.role === "Admin" ||
    session?.user?.modulePermissions?.includes("SYSTEM_SETTINGS_MANAGE");

  useEffect(() => {
    setIsClient(true);
    if (sessionStatus === 'unauthenticated') {
      signIn(undefined, { callbackUrl: pathname });
    } else if (sessionStatus === 'authenticated') {
      // Fetch from backend
      async function fetchPrefs() {
        setLoading(true);
        setErrorMsg(null);
        try {
          const res = await fetch('/api/settings/system-settings');
          if (!res.ok) throw new Error('Failed to load system preferences');
          const data = await res.json();
          setThemePreference((data[APP_THEME_KEY] as ThemePreference) || DEFAULT_THEME);
          setAppName(data[APP_NAME_KEY] || DEFAULT_APP_NAME);
          setSavedLogoUrl(data.appLogoDataUrl || null);
          setLogoPreviewUrl(data.appLogoDataUrl || null);
          setSavedFaviconUrl(data.appFaviconDataUrl || null);
          setFaviconPreviewUrl(data.appFaviconDataUrl || null);
          
          // Load new contextual logo settings
          setSavedLoginPageLogoLightModeUrl(data.loginPageLogoLightMode || null);
          setLoginPageLogoLightModePreviewUrl(data.loginPageLogoLightMode || null);
          setSavedLoginPageLogoDarkModeUrl(data.loginPageLogoDarkMode || null);
          setLoginPageLogoDarkModePreviewUrl(data.loginPageLogoDarkMode || null);
          
          setSavedSidebarLogoCollapsedLightModeUrl(data.sidebarLogoCollapsedLightMode || null);
          setSidebarLogoCollapsedLightModePreviewUrl(data.sidebarLogoCollapsedLightMode || null);
          setSavedSidebarLogoExpandedLightModeUrl(data.sidebarLogoExpandedLightMode || null);
          setSidebarLogoExpandedLightModePreviewUrl(data.sidebarLogoExpandedLightMode || null);
          
          setSavedSidebarLogoCollapsedDarkModeUrl(data.sidebarLogoCollapsedDarkMode || null);
          setSidebarLogoCollapsedDarkModePreviewUrl(data.sidebarLogoCollapsedDarkMode || null);
          setSavedSidebarLogoExpandedDarkModeUrl(data.sidebarLogoExpandedDarkMode || null);
          setSidebarLogoExpandedDarkModePreviewUrl(data.sidebarLogoExpandedDarkMode || null);
          
          // Load login page design settings
          setLoginBackgroundType((data[LOGIN_BACKGROUND_TYPE_KEY] as LoginBackgroundType) || DEFAULT_LOGIN_BACKGROUND_TYPE);
          setSavedLoginImageDataUrl(data[LOGIN_BACKGROUND_IMAGE_KEY] || null);
          setLoginImagePreviewUrl(data[LOGIN_BACKGROUND_IMAGE_KEY] || null);
          setLoginBackgroundGradientStart(data[LOGIN_BACKGROUND_GRADIENT_START_KEY] || DEFAULT_LOGIN_BACKGROUND_GRADIENT_START);
          setLoginBackgroundGradientEnd(data[LOGIN_BACKGROUND_GRADIENT_END_KEY] || DEFAULT_LOGIN_BACKGROUND_GRADIENT_END);
          setLoginBackgroundColor(data[LOGIN_BACKGROUND_COLOR_KEY] || DEFAULT_LOGIN_BACKGROUND_COLOR);
          
          // Load sidebar colors
          const newSidebarColors = createInitialSidebarColors();
          SIDEBAR_COLOR_KEYS.forEach(key => {
            if (data[key]) {
              (newSidebarColors as any)[key] = data[key];
            }
          });
          setSidebarColors(newSidebarColors);
          applySidebarStyles(newSidebarColors);

          // Initialize sidebar active style from backend or localStorage
          const backendSidebarStyle = data.sidebarActiveStylePreference;
          if (backendSidebarStyle) {
            setSidebarActiveStyle(backendSidebarStyle);
          } else {
            setSidebarActiveStyle(getSidebarActiveStyle());
          }

          // Load primary button colors
          if (data.primaryGradientStart) setPrimaryGradientStart(data.primaryGradientStart);
          if (data.primaryGradientEnd) setPrimaryGradientEnd(data.primaryGradientEnd);

          setAppMenuIcon(data.appMenuIcon || "");
          setAppMenuIconType(data.appMenuIcon && (data.appMenuIcon.startsWith('http') || data.appMenuIcon.startsWith('/')) ? "image" : "lucide");
        } catch (e: any) {
          setErrorMsg(e.message);
        } finally {
          setLoading(false);
        }
      }
      fetchPrefs();
    }
  }, [sessionStatus, router, pathname, signIn]);

  useEffect(() => {
    applySidebarStyles(sidebarColors);
  }, [sidebarColors]);

  const handleLogoFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        error('Logo file size must be less than 5MB');
        return;
      }
      setSelectedLogoFile(file);
      setLogoPreviewUrl(null); // Clear preview until upload completes
      // Upload to MinIO
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/settings/upload-image', {
          method: 'PUT',
          body: formData,
        });
        if (!res.ok) throw new Error('Failed to upload logo');
        const { url } = await res.json();
        setLogoPreviewUrl(url); // Only use MinIO URL
        success('Logo uploaded!');
      } catch (e: any) {
        error(e.message || 'Failed to upload logo');
      }
    }
  };

  // Helper function to create logo upload handlers
  const createLogoUploadHandler = (
    setPreviewUrl: (url: string | null) => void,
    successMessage: string
  ) => async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        error('Logo file size must be less than 5MB');
        return;
      }
      setPreviewUrl(null); // Clear preview until upload completes
      // Upload to MinIO
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/settings/upload-image', {
          method: 'PUT',
          body: formData,
        });
        if (!res.ok) throw new Error('Failed to upload logo');
        const { url } = await res.json();
        setPreviewUrl(url); // Only use MinIO URL
        success(successMessage);
      } catch (e: any) {
        error(e.message || 'Failed to upload logo');
      }
    }
  };

  // Logo upload handlers for each variant
  const handleLoginPageLogoLightModeChange = createLogoUploadHandler(
    setLoginPageLogoLightModePreviewUrl,
    'Login page light mode logo uploaded!'
  );
  
  const handleLoginPageLogoDarkModeChange = createLogoUploadHandler(
    setLoginPageLogoDarkModePreviewUrl,
    'Login page dark mode logo uploaded!'
  );

  const handleSidebarLogoCollapsedLightModeChange = createLogoUploadHandler(
    setSidebarLogoCollapsedLightModePreviewUrl,
    'Sidebar collapsed light mode logo uploaded!'
  );

  const handleSidebarLogoExpandedLightModeChange = createLogoUploadHandler(
    setSidebarLogoExpandedLightModePreviewUrl,
    'Sidebar expanded light mode logo uploaded!'
  );

  const handleSidebarLogoCollapsedDarkModeChange = createLogoUploadHandler(
    setSidebarLogoCollapsedDarkModePreviewUrl,
    'Sidebar collapsed dark mode logo uploaded!'
  );

  const handleSidebarLogoExpandedDarkModeChange = createLogoUploadHandler(
    setSidebarLogoExpandedDarkModePreviewUrl,
    'Sidebar expanded dark mode logo uploaded!'
  );

  const handleFaviconFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) { // 1MB limit for favicon
        error('Favicon file size must be less than 1MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        error('Please select a valid image file for favicon');
        return;
      }
      setSelectedFaviconFile(file);
      setFaviconPreviewUrl(null); // Clear preview until upload completes
      // Upload to MinIO
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/settings/upload-image', {
          method: 'PUT',
          body: formData,
        });
        if (!res.ok) throw new Error('Failed to upload favicon');
        const { url } = await res.json();
        setFaviconPreviewUrl(url); // Only use MinIO URL
        success('Favicon uploaded!');
      } catch (e: any) {
        error(e.message || 'Failed to upload favicon');
      }
    }
  };

  const clearLogoSelection = () => {
    setSelectedLogoFile(null);
    setLogoPreviewUrl(savedLogoUrl);
  };

  const clearFaviconSelection = () => {
    setSelectedFaviconFile(null);
    setFaviconPreviewUrl(savedFaviconUrl);
  };

  const removeSelectedLogo = (clearSaved: boolean = false) => {
    setSelectedLogoFile(null);
    const fileInput = document.getElementById('app-logo-upload') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = '';
    }
    if (clearSaved) {
        setSavedLogoUrl(null);
        setLogoPreviewUrl(null);
        success("Logo Cleared: The application logo has been reset to default.");
    } else {
        setLogoPreviewUrl(savedLogoUrl);
    }
  };

  const handleLoginImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { // 500KB limit
        error('Login background image must be less than 500KB');
        return;
      }
      setSelectedLoginImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setLoginImagePreviewUrl(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedLoginImage = (clearSaved: boolean = false) => {
    if (clearSaved) {
      setSavedLoginImageDataUrl(null);
      setLoginImagePreviewUrl(null);
    } else {
      setSelectedLoginImageFile(null);
      setLoginImagePreviewUrl(savedLoginImageDataUrl);
    }
  };

  const handleSavePreferences = async () => {
    if (!canEdit) return;
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(false);
    try {
      // Convert to the format expected by the backend
      const allowedKeys = [
        'themePreference',
        'appName',
        'appLogoDataUrl',
        'appFaviconDataUrl',
        // New contextual logo settings
        'loginPageLogoLightMode',
        'loginPageLogoDarkMode',
        'sidebarLogoCollapsedLightMode',
        'sidebarLogoExpandedLightMode',
        'sidebarLogoCollapsedDarkMode',
        'sidebarLogoExpandedDarkMode',
        'loginBackgroundType',
        'loginBackgroundGradientStart',
        'loginBackgroundGradientEnd',
        'loginBackgroundColor',
        'loginPageBackgroundImageUrl',
        // Add all sidebar color keys
        ...Object.keys(sidebarColors)
      ];
      let settingsToSave = [
        { key: 'themePreference', value: themePreference },
        { key: 'appName', value: appName },
        { key: 'appLogoDataUrl', value: logoPreviewUrl || savedLogoUrl },
        { key: 'appFaviconDataUrl', value: faviconPreviewUrl || savedFaviconUrl },
        // New contextual logo settings
        { key: 'loginPageLogoLightMode', value: loginPageLogoLightModePreviewUrl || savedLoginPageLogoLightModeUrl },
        { key: 'loginPageLogoDarkMode', value: loginPageLogoDarkModePreviewUrl || savedLoginPageLogoDarkModeUrl },
        { key: 'sidebarLogoCollapsedLightMode', value: sidebarLogoCollapsedLightModePreviewUrl || savedSidebarLogoCollapsedLightModeUrl },
        { key: 'sidebarLogoExpandedLightMode', value: sidebarLogoExpandedLightModePreviewUrl || savedSidebarLogoExpandedLightModeUrl },
        { key: 'sidebarLogoCollapsedDarkMode', value: sidebarLogoCollapsedDarkModePreviewUrl || savedSidebarLogoCollapsedDarkModeUrl },
        { key: 'sidebarLogoExpandedDarkMode', value: sidebarLogoExpandedDarkModePreviewUrl || savedSidebarLogoExpandedDarkModeUrl },
        { key: 'loginBackgroundType', value: loginBackgroundType },
        { key: 'loginBackgroundGradientStart', value: loginBackgroundGradientStart },
        { key: 'loginBackgroundGradientEnd', value: loginBackgroundGradientEnd },
        { key: 'loginBackgroundColor', value: loginBackgroundColor },
        { key: 'loginPageBackgroundImageUrl', value: selectedLoginImageFile ? loginImagePreviewUrl : savedLoginImageDataUrl },
        // Always sync primaryGradientStart/End to sidebar active color
        { key: 'primaryGradientStart', value: primaryGradientStart || DEFAULT_PRIMARY_GRADIENT_START },
        { key: 'primaryGradientEnd', value: primaryGradientEnd || DEFAULT_PRIMARY_GRADIENT_END },
      ];
      // Add sidebar colors
      Object.entries(sidebarColors).forEach(([key, value]) => {
        if (value) {
          settingsToSave.push({ key, value });
        }
      });
      // Sanitize: only allowed keys, and all values are string or null
      settingsToSave = settingsToSave
        .filter(({ key }) => allowedKeys.includes(key))
        .map(({ key, value }) => ({
          key,
          value: value === undefined ? null : value === null ? null : String(value)
        }));
      
      const res = await fetch('/api/settings/system-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsToSave),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save preferences');
      }
      
      // Update saved states
      if (logoPreviewUrl) {
        setSavedLogoUrl(logoPreviewUrl);
        setSelectedLogoFile(null);
      }
      
      if (faviconPreviewUrl) {
        setSavedFaviconUrl(faviconPreviewUrl);
        setSelectedFaviconFile(null);
      }
      
      if (selectedLoginImageFile) {
        setSavedLoginImageDataUrl(loginImagePreviewUrl);
        setSelectedLoginImageFile(null);
      }

      // Trigger favicon update
      window.dispatchEvent(new CustomEvent('faviconUpdated', {
        detail: { faviconDataUrl: faviconPreviewUrl }
      }));
      
      success('Preferences saved successfully!');
      setSuccessMsg(true);
      
      // Immediately update theme/colors in DOM
      setThemeAndColors({
        themePreference,
        primaryGradientStart: primaryGradientStart || sidebarColors.sidebarActiveBgStartL || DEFAULT_PRIMARY_GRADIENT_START,
        primaryGradientEnd: primaryGradientEnd || sidebarColors.sidebarActiveBgEndL || DEFAULT_PRIMARY_GRADIENT_END,
        sidebarColors,
      });
      
      // Dispatch event for real-time updates with sidebar colors and contextual logos
      window.dispatchEvent(new CustomEvent('appConfigChanged', {
        detail: {
          appName,
          logoUrl: logoPreviewUrl || savedLogoUrl,
          themePreference,
          primaryGradientStart: primaryGradientStart || sidebarColors.sidebarActiveBgStartL || DEFAULT_PRIMARY_GRADIENT_START,
          primaryGradientEnd: primaryGradientEnd || sidebarColors.sidebarActiveBgEndL || DEFAULT_PRIMARY_GRADIENT_END,
          sidebarColors,
          sidebarActiveStyle,
          contextualLogos: {
            sidebarLogoCollapsedLightMode: sidebarLogoCollapsedLightModePreviewUrl || savedSidebarLogoCollapsedLightModeUrl,
            sidebarLogoExpandedLightMode: sidebarLogoExpandedLightModePreviewUrl || savedSidebarLogoExpandedLightModeUrl,
            sidebarLogoCollapsedDarkMode: sidebarLogoCollapsedDarkModePreviewUrl || savedSidebarLogoCollapsedDarkModeUrl,
            sidebarLogoExpandedDarkMode: sidebarLogoExpandedDarkModePreviewUrl || savedSidebarLogoExpandedDarkModeUrl,
          },
        }
      }));
      
    } catch (e: any) {
      setErrorMsg(e.message);
      console.error('Failed to save preferences:', e);
    } finally {
      setSaving(false);
    }
  };

  function renderSidebarColorInputs(theme: 'Light' | 'Dark') {
    const suffix = theme === 'Light' ? 'L' : 'D';
    const keys: (keyof SidebarColors)[] = [
      `sidebarBgStart${suffix}` as keyof SidebarColors,
      `sidebarBgEnd${suffix}` as keyof SidebarColors,
      `sidebarText${suffix}` as keyof SidebarColors,
      `sidebarActiveBgStart${suffix}` as keyof SidebarColors,
      `sidebarActiveBgEnd${suffix}` as keyof SidebarColors,
      `sidebarActiveText${suffix}` as keyof SidebarColors,
      `sidebarHoverBg${suffix}` as keyof SidebarColors,
      `sidebarHoverText${suffix}` as keyof SidebarColors,
      `sidebarBorder${suffix}` as keyof SidebarColors,
    ];
    const labels: Record<string, string> = {
      [`sidebarBgStart${suffix}`]: "Background Start",
      [`sidebarBgEnd${suffix}`]: "Background End",
      [`sidebarText${suffix}`]: "Text Color",
      [`sidebarActiveBgStart${suffix}`]: "Active BG Start",
      [`sidebarActiveBgEnd${suffix}`]: "Active BG End",
      [`sidebarActiveText${suffix}`]: "Active Text",
      [`sidebarHoverBg${suffix}`]: "Hover Background",
      [`sidebarHoverText${suffix}`]: "Hover Text",
      [`sidebarBorder${suffix}`]: "Border Color",
    };
    return keys.map((key) => (
      <div key={key} className="space-y-2">
        <Label htmlFor={String(key)} className="text-sm font-medium">
          {labels[String(key)]}
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id={String(key)}
            type="text"
            value={sidebarColors[key] || ''}
            onChange={e => setSidebarColors((prev: SidebarColors) => ({ ...prev, [key]: e.target.value }))}
            placeholder="220 25% 97%"
            className="text-sm"
          />
          <Input
            type="color"
            value={convertHslStringToHex(sidebarColors[key])}
            onChange={e => setSidebarColors((prev: SidebarColors) => ({ ...prev, [key]: hexToHslString(e.target.value) }))}
            className="w-10 h-9 p-1 rounded-md border"
          />
        </div>
      </div>
    ));
  }

  function resetSidebarColors(theme: 'Light' | 'Dark') {
    const suffix = theme === 'Light' ? 'L' : 'D';
    const newSidebarColors = createInitialSidebarColors();
    setSidebarColors(newSidebarColors);
    applySidebarStyles(newSidebarColors);
  }

  if (loading || sessionStatus === 'loading' || (sessionStatus === 'unauthenticated' && pathname !== '/auth/signin' && !pathname.startsWith('/_next/')) || !isClient) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background fixed inset-0 z-50">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-destructive font-semibold mb-2">{errorMsg}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Preferences</h1>
          <p className="text-muted-foreground">Manage application appearance, branding, and global settings</p>
        </div>
        <Button 
          onClick={handleSavePreferences} 
          disabled={saving || !canEdit}
          variant="default"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="general" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <ImageUp className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="sidebar" className="flex items-center gap-2">
              <SidebarIcon className="h-4 w-4" />
              Sidebar
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="general" className="h-full">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  {/* App Name Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PenSquare className="h-5 w-5 text-primary" />
                        Application Name
                      </CardTitle>
                      <CardDescription>
                        Set the name that appears throughout the application
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Label htmlFor="app-name-input">Application Name</Label>
                        <Input
                          id="app-name-input"
                          type="text"
                          value={appName}
                          onChange={(e) => setAppName(e.target.value)}
                          placeholder="e.g., CandiTrack Pro"
                          disabled={!canEdit}
                        />
                        <p className="text-xs text-muted-foreground">
                          This name will be displayed in the header, browser tab, and other locations
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Theme Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sun className="h-5 w-5 text-primary" />
                        Theme Settings
                      </CardTitle>
                      <CardDescription>
                        Configure the default theme for new users
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Label>Default Theme</Label>
                        <RadioGroup
                          value={themePreference}
                          onValueChange={(value) => setThemePreference(value as ThemePreference)}
                          className="grid grid-cols-3 gap-4"
                          disabled={!canEdit}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="light" id="theme-light" />
                            <Label htmlFor="theme-light" className="flex items-center gap-2">
                              <Sun className="h-4 w-4" />
                              Light
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="dark" id="theme-dark" />
                            <Label htmlFor="theme-dark" className="flex items-center gap-2">
                              <Moon className="h-4 w-4" />
                              Dark
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="system" id="theme-system" />
                            <Label htmlFor="theme-system" className="flex items-center gap-2">
                              <RotateCcw className="h-4 w-4" />
                              System
                            </Label>
                          </div>
                        </RadioGroup>
                        <p className="text-xs text-muted-foreground">
                          Users can still override this setting in their personal preferences
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="appearance" className="h-full">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  {/* Login Page Design */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <LogIn className="h-5 w-5 text-primary" />
                        Login Page Design
                      </CardTitle>
                      <CardDescription>
                        Customize the appearance of the login page
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Background Type */}
                      <div className="space-y-3">
                        <Label>Background Type</Label>
                        <RadioGroup
                          value={loginBackgroundType}
                          onValueChange={(value) => setLoginBackgroundType(value as LoginBackgroundType)}
                          className="grid grid-cols-3 gap-4"
                          disabled={!canEdit}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="gradient" id="bg-gradient" />
                            <Label htmlFor="bg-gradient">Gradient</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="image" id="bg-image" />
                            <Label htmlFor="bg-image">Image</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="solid" id="bg-solid" />
                            <Label htmlFor="bg-solid">Solid Color</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* Background Image */}
                      {loginBackgroundType === 'image' && (
                        <div className="space-y-3">
                          <Label>Background Image</Label>
                          <div className="flex items-center gap-4">
                            {loginImagePreviewUrl && (
                              <div className="relative">
                                <img
                                  src={loginImagePreviewUrl}
                                  alt="Login background preview"
                                  className="w-32 h-20 object-cover rounded-md border"
                                />
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  className="absolute -top-2 -right-2 h-6 w-6"
                                  onClick={() => removeSelectedLoginImage(true)}
                                  disabled={!canEdit}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            <div className="flex-1">
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={handleLoginImageFileChange}
                                disabled={!canEdit}
                                className="hidden"
                                id="login-bg-upload"
                              />
                              <Label
                                htmlFor="login-bg-upload"
                                className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                              >
                                <ImageUp className="mr-2 h-4 w-4" />
                                Upload Image
                              </Label>
                              <p className="text-xs text-muted-foreground mt-1">
                                Recommended: 1920x1080, max 500KB
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Gradient Colors */}
                      {loginBackgroundType === 'gradient' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Gradient Start Color</Label>
                            <div className="flex gap-2">
                              <Input
                                value={loginBackgroundGradientStart}
                                onChange={(e) => setLoginBackgroundGradientStart(e.target.value)}
                                placeholder="179 67% 66%"
                                disabled={!canEdit}
                              />
                              <Input
                                type="color"
                                value={convertHslStringToHex(loginBackgroundGradientStart)}
                                onChange={(e) => setLoginBackgroundGradientStart(hexToHslString(e.target.value))}
                                className="w-12 h-10 p-1 rounded-md border"
                                disabled={!canEdit}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Gradient End Color</Label>
                            <div className="flex gap-2">
                              <Input
                                value={loginBackgroundGradientEnd}
                                onChange={(e) => setLoginBackgroundGradientEnd(e.target.value)}
                                placeholder="238 74% 61%"
                                disabled={!canEdit}
                              />
                              <Input
                                type="color"
                                value={convertHslStringToHex(loginBackgroundGradientEnd)}
                                onChange={(e) => setLoginBackgroundGradientEnd(hexToHslString(e.target.value))}
                                className="w-12 h-10 p-1 rounded-md border"
                                disabled={!canEdit}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Solid Color */}
                      {loginBackgroundType === 'solid' && (
                        <div className="space-y-2">
                          <Label>Background Color</Label>
                          <div className="flex gap-2">
                            <Input
                              value={loginBackgroundColor}
                              onChange={(e) => setLoginBackgroundColor(e.target.value)}
                              placeholder="220 25% 97%"
                              disabled={!canEdit}
                            />
                            <Input
                              type="color"
                              value={convertHslStringToHex(loginBackgroundColor)}
                              onChange={(e) => setLoginBackgroundColor(hexToHslString(e.target.value))}
                              className="w-12 h-10 p-1 rounded-md border"
                              disabled={!canEdit}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="branding" className="h-full">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  {/* App Logo */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ImageUp className="h-5 w-5 text-primary" />
                        Application Logo
                      </CardTitle>
                      <CardDescription>
                        Upload your company logo to appear in the application header
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          {logoPreviewUrl && (
                            <div className="relative">
                              <img
                                src={logoPreviewUrl}
                                alt="Logo preview"
                                className="w-32 h-16 object-contain rounded-md border bg-background"
                              />
                              <Button
                                size="icon"
                                variant="destructive"
                                className="absolute -top-2 -right-2 h-6 w-6"
                                onClick={() => removeSelectedLogo(true)}
                                disabled={!canEdit}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          <div className="flex-1">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoFileChange}
                              disabled={!canEdit}
                              className="hidden"
                              id="app-logo-upload"
                            />
                            <Label
                              htmlFor="app-logo-upload"
                              className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                            >
                              <ImageUp className="mr-2 h-4 w-4" />
                              Upload Logo
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Recommended: 200x80px, max 5MB
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Contextual Logo Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ImageUp className="h-5 w-5 text-primary" />
                        Contextual Logo Settings
                      </CardTitle>
                      <CardDescription>
                        Configure different logos for various contexts and themes. Leave empty to use the default application logo.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-8">
                        {/* Login Page Logos */}
                        <div>
                          <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                            <LogIn className="h-4 w-4" />
                            Login Page Logos
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Login Light Mode */}
                            <div className="space-y-3">
                              <Label className="text-sm font-medium flex items-center gap-2">
                                <Sun className="h-4 w-4" />
                                Light Mode
                              </Label>
                              <div className="flex items-center gap-4">
                                {loginPageLogoLightModePreviewUrl && (
                                  <div className="relative">
                                    <img
                                      src={loginPageLogoLightModePreviewUrl}
                                      alt="Login light mode logo"
                                      className="w-24 h-12 object-contain rounded-md border bg-background"
                                    />
                                    <Button
                                      size="icon"
                                      variant="destructive"
                                      className="absolute -top-2 -right-2 h-5 w-5"
                                      onClick={() => {
                                        setLoginPageLogoLightModePreviewUrl(null);
                                        setSavedLoginPageLogoLightModeUrl(null);
                                      }}
                                      disabled={!canEdit}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                                <div className="flex-1">
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLoginPageLogoLightModeChange}
                                    disabled={!canEdit}
                                    className="hidden"
                                    id="login-logo-light-upload"
                                  />
                                  <Label
                                    htmlFor="login-logo-light-upload"
                                    className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 py-1"
                                  >
                                    <ImageUp className="mr-2 h-3 w-3" />
                                    Upload
                                  </Label>
                                </div>
                              </div>
                            </div>

                            {/* Login Dark Mode */}
                            <div className="space-y-3">
                              <Label className="text-sm font-medium flex items-center gap-2">
                                <Moon className="h-4 w-4" />
                                Dark Mode
                              </Label>
                              <div className="flex items-center gap-4">
                                {loginPageLogoDarkModePreviewUrl && (
                                  <div className="relative">
                                    <img
                                      src={loginPageLogoDarkModePreviewUrl}
                                      alt="Login dark mode logo"
                                      className="w-24 h-12 object-contain rounded-md border bg-background"
                                    />
                                    <Button
                                      size="icon"
                                      variant="destructive"
                                      className="absolute -top-2 -right-2 h-5 w-5"
                                      onClick={() => {
                                        setLoginPageLogoDarkModePreviewUrl(null);
                                        setSavedLoginPageLogoDarkModeUrl(null);
                                      }}
                                      disabled={!canEdit}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                                <div className="flex-1">
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLoginPageLogoDarkModeChange}
                                    disabled={!canEdit}
                                    className="hidden"
                                    id="login-logo-dark-upload"
                                  />
                                  <Label
                                    htmlFor="login-logo-dark-upload"
                                    className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 py-1"
                                  >
                                    <ImageUp className="mr-2 h-3 w-3" />
                                    Upload
                                  </Label>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Sidebar Logos */}
                        <div>
                          <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                            <SidebarIcon className="h-4 w-4" />
                            Sidebar Logos
                          </h4>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Light Mode Sidebar */}
                            <div className="space-y-4">
                              <h5 className="text-sm font-medium flex items-center gap-2">
                                <Sun className="h-4 w-4" />
                                Light Mode
                              </h5>
                              
                              {/* Collapsed Light Mode */}
                              <div className="space-y-3">
                                <Label className="text-xs font-medium text-muted-foreground">Collapsed State</Label>
                                <div className="flex items-center gap-4">
                                  {sidebarLogoCollapsedLightModePreviewUrl && (
                                    <div className="relative">
                                      <img
                                        src={sidebarLogoCollapsedLightModePreviewUrl}
                                        alt="Sidebar collapsed light logo"
                                        className="w-16 h-8 object-contain rounded border bg-background"
                                      />
                                      <Button
                                        size="icon"
                                        variant="destructive"
                                        className="absolute -top-1 -right-1 h-4 w-4"
                                        onClick={() => {
                                          setSidebarLogoCollapsedLightModePreviewUrl(null);
                                          setSavedSidebarLogoCollapsedLightModeUrl(null);
                                        }}
                                        disabled={!canEdit}
                                      >
                                        <X className="h-2 w-2" />
                                      </Button>
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <Input
                                      type="file"
                                      accept="image/*"
                                      onChange={handleSidebarLogoCollapsedLightModeChange}
                                      disabled={!canEdit}
                                      className="hidden"
                                      id="sidebar-collapsed-light-upload"
                                    />
                                    <Label
                                      htmlFor="sidebar-collapsed-light-upload"
                                      className="cursor-pointer inline-flex items-center justify-center rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-2"
                                    >
                                      <ImageUp className="mr-1 h-3 w-3" />
                                      Upload
                                    </Label>
                                  </div>
                                </div>
                              </div>

                              {/* Expanded Light Mode */}
                              <div className="space-y-3">
                                <Label className="text-xs font-medium text-muted-foreground">Expanded State</Label>
                                <div className="flex items-center gap-4">
                                  {sidebarLogoExpandedLightModePreviewUrl && (
                                    <div className="relative">
                                      <img
                                        src={sidebarLogoExpandedLightModePreviewUrl}
                                        alt="Sidebar expanded light logo"
                                        className="w-20 h-10 object-contain rounded border bg-background"
                                      />
                                      <Button
                                        size="icon"
                                        variant="destructive"
                                        className="absolute -top-1 -right-1 h-4 w-4"
                                        onClick={() => {
                                          setSidebarLogoExpandedLightModePreviewUrl(null);
                                          setSavedSidebarLogoExpandedLightModeUrl(null);
                                        }}
                                        disabled={!canEdit}
                                      >
                                        <X className="h-2 w-2" />
                                      </Button>
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <Input
                                      type="file"
                                      accept="image/*"
                                      onChange={handleSidebarLogoExpandedLightModeChange}
                                      disabled={!canEdit}
                                      className="hidden"
                                      id="sidebar-expanded-light-upload"
                                    />
                                    <Label
                                      htmlFor="sidebar-expanded-light-upload"
                                      className="cursor-pointer inline-flex items-center justify-center rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-2"
                                    >
                                      <ImageUp className="mr-1 h-3 w-3" />
                                      Upload
                                    </Label>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Dark Mode Sidebar */}
                            <div className="space-y-4">
                              <h5 className="text-sm font-medium flex items-center gap-2">
                                <Moon className="h-4 w-4" />
                                Dark Mode
                              </h5>
                              
                              {/* Collapsed Dark Mode */}
                              <div className="space-y-3">
                                <Label className="text-xs font-medium text-muted-foreground">Collapsed State</Label>
                                <div className="flex items-center gap-4">
                                  {sidebarLogoCollapsedDarkModePreviewUrl && (
                                    <div className="relative">
                                      <img
                                        src={sidebarLogoCollapsedDarkModePreviewUrl}
                                        alt="Sidebar collapsed dark logo"
                                        className="w-16 h-8 object-contain rounded border bg-background"
                                      />
                                      <Button
                                        size="icon"
                                        variant="destructive"
                                        className="absolute -top-1 -right-1 h-4 w-4"
                                        onClick={() => {
                                          setSidebarLogoCollapsedDarkModePreviewUrl(null);
                                          setSavedSidebarLogoCollapsedDarkModeUrl(null);
                                        }}
                                        disabled={!canEdit}
                                      >
                                        <X className="h-2 w-2" />
                                      </Button>
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <Input
                                      type="file"
                                      accept="image/*"
                                      onChange={handleSidebarLogoCollapsedDarkModeChange}
                                      disabled={!canEdit}
                                      className="hidden"
                                      id="sidebar-collapsed-dark-upload"
                                    />
                                    <Label
                                      htmlFor="sidebar-collapsed-dark-upload"
                                      className="cursor-pointer inline-flex items-center justify-center rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-2"
                                    >
                                      <ImageUp className="mr-1 h-3 w-3" />
                                      Upload
                                    </Label>
                                  </div>
                                </div>
                              </div>

                              {/* Expanded Dark Mode */}
                              <div className="space-y-3">
                                <Label className="text-xs font-medium text-muted-foreground">Expanded State</Label>
                                <div className="flex items-center gap-4">
                                  {sidebarLogoExpandedDarkModePreviewUrl && (
                                    <div className="relative">
                                      <img
                                        src={sidebarLogoExpandedDarkModePreviewUrl}
                                        alt="Sidebar expanded dark logo"
                                        className="w-20 h-10 object-contain rounded border bg-background"
                                      />
                                      <Button
                                        size="icon"
                                        variant="destructive"
                                        className="absolute -top-1 -right-1 h-4 w-4"
                                        onClick={() => {
                                          setSidebarLogoExpandedDarkModePreviewUrl(null);
                                          setSavedSidebarLogoExpandedDarkModeUrl(null);
                                        }}
                                        disabled={!canEdit}
                                      >
                                        <X className="h-2 w-2" />
                                      </Button>
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <Input
                                      type="file"
                                      accept="image/*"
                                      onChange={handleSidebarLogoExpandedDarkModeChange}
                                      disabled={!canEdit}
                                      className="hidden"
                                      id="sidebar-expanded-dark-upload"
                                    />
                                    <Label
                                      htmlFor="sidebar-expanded-dark-upload"
                                      className="cursor-pointer inline-flex items-center justify-center rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-2"
                                    >
                                      <ImageUp className="mr-1 h-3 w-3" />
                                      Upload
                                    </Label>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <strong>Tip:</strong> If a contextual logo is not set, the default application logo will be used. 
                          For sidebar collapsed mode, square/icon-style logos work best, while expanded mode can accommodate wider logos.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Favicon */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ImageUp className="h-5 w-5 text-primary" />
                        Favicon
                      </CardTitle>
                      <CardDescription>
                        Upload a favicon to appear in browser tabs
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          {faviconPreviewUrl && (
                            <div className="relative">
                              <img
                                src={faviconPreviewUrl}
                                alt="Favicon preview"
                                className="w-8 h-8 object-contain rounded border bg-background"
                              />
                              <Button
                                size="icon"
                                variant="destructive"
                                className="absolute -top-2 -right-2 h-6 w-6"
                                onClick={() => clearFaviconSelection()}
                                disabled={!canEdit}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          <div className="flex-1">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleFaviconFileChange}
                              disabled={!canEdit}
                              className="hidden"
                              id="app-favicon-upload"
                            />
                            <Label
                              htmlFor="app-favicon-upload"
                              className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                            >
                              <ImageUp className="mr-2 h-4 w-4" />
                              Upload Favicon
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Recommended: 32x32px, max 1MB
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="sidebar" className="h-full">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  {/* Sidebar Active Style */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <SidebarIcon className="h-5 w-5 text-primary" />
                        Sidebar Active Menu Style
                      </CardTitle>
                      <CardDescription>
                        Choose how selected menu items appear in the sidebar
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="sidebar-active-style" className="text-sm font-medium">
                            Active Menu Style
                          </Label>
                          <Select
                            value={sidebarActiveStyle}
                            onValueChange={(value: SidebarActiveStyle) => {
                              setSidebarActiveStyle(value);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gradient">Gradient Background</SelectItem>
                              <SelectItem value="solid">Solid Background</SelectItem>
                              <SelectItem value="outline">Outline Border</SelectItem>
                              <SelectItem value="subtle">Subtle Highlight</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Changes apply immediately for preview. Save to persist the setting.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sidebar Colors */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <SidebarIcon className="h-5 w-5 text-primary" />
                        Sidebar Colors
                      </CardTitle>
                      <CardDescription>
                        Customize the sidebar appearance for light and dark themes
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="light" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="light">Light Theme</TabsTrigger>
                          <TabsTrigger value="dark">Dark Theme</TabsTrigger>
                        </TabsList>
                        <TabsContent value="light" className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium">Light Theme Colors</h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resetSidebarColors('Light')}
                              disabled={!canEdit}
                            >
                              <RotateCcw className="mr-2 h-3 w-3" />
                              Reset
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {renderSidebarColorInputs('Light')}
                          </div>
                        </TabsContent>
                        <TabsContent value="dark" className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium">Dark Theme Colors</h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resetSidebarColors('Dark')}
                              disabled={!canEdit}
                            >
                              <RotateCcw className="mr-2 h-3 w-3" />
                              Reset
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {renderSidebarColorInputs('Dark')}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>

                  {/* Sidebar Group Labels */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Type className="h-5 w-5 text-primary" />
                        Group Labels
                      </CardTitle>
                      <CardDescription>
                        Customize the appearance of sidebar group labels (General, Recruitment, Other)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="light" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="light">Light Theme</TabsTrigger>
                          <TabsTrigger value="dark">Dark Theme</TabsTrigger>
                        </TabsList>
                        <TabsContent value="light" className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium">Light Theme Group Labels</h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resetSidebarColors('Light')}
                              disabled={!canEdit}
                            >
                              <RotateCcw className="mr-2 h-3 w-3" />
                              Reset
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {/* Group Label Color */}
                            <div className="space-y-2">
                              <Label htmlFor="sidebarGroupLabelColorL" className="text-sm font-medium">
                                Label Color
                              </Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  id="sidebarGroupLabelColorL"
                                  type="text"
                                  value={sidebarColors.sidebarGroupLabelColorL || ''}
                                  onChange={e => setSidebarColors((prev: SidebarColors) => ({ ...prev, sidebarGroupLabelColorL: e.target.value }))}
                                  placeholder="220 15% 50%"
                                  className="text-sm"
                                />
                                <Input
                                  type="color"
                                  value={convertHslStringToHex(sidebarColors.sidebarGroupLabelColorL)}
                                  onChange={e => setSidebarColors((prev: SidebarColors) => ({ ...prev, sidebarGroupLabelColorL: hexToHslString(e.target.value) }))}
                                  className="w-10 h-9 p-1 rounded-md border"
                                />
                              </div>
                            </div>

                            {/* Group Label Font Size */}
                            <div className="space-y-2">
                              <Label htmlFor="sidebarGroupLabelFontSizeL" className="text-sm font-medium">
                                Font Size
                              </Label>
                              <Select
                                value={sidebarColors.sidebarGroupLabelFontSizeL || '0.75rem'}
                                onValueChange={(value) => setSidebarColors((prev: SidebarColors) => ({ ...prev, sidebarGroupLabelFontSizeL: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0.625rem">Extra Small (10px)</SelectItem>
                                  <SelectItem value="0.75rem">Small (12px)</SelectItem>
                                  <SelectItem value="0.875rem">Medium (14px)</SelectItem>
                                  <SelectItem value="1rem">Large (16px)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Group Label Font Weight */}
                            <div className="space-y-2">
                              <Label htmlFor="sidebarGroupLabelFontWeightL" className="text-sm font-medium">
                                Font Weight
                              </Label>
                              <Select
                                value={sidebarColors.sidebarGroupLabelFontWeightL || '500'}
                                onValueChange={(value) => setSidebarColors((prev: SidebarColors) => ({ ...prev, sidebarGroupLabelFontWeightL: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="400">Normal</SelectItem>
                                  <SelectItem value="500">Medium</SelectItem>
                                  <SelectItem value="600">Semi Bold</SelectItem>
                                  <SelectItem value="700">Bold</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Group Label Text Transform */}
                            <div className="space-y-2">
                              <Label htmlFor="sidebarGroupLabelTextTransformL" className="text-sm font-medium">
                                Text Transform
                              </Label>
                              <Select
                                value={sidebarColors.sidebarGroupLabelTextTransformL || 'uppercase'}
                                onValueChange={(value) => setSidebarColors((prev: SidebarColors) => ({ ...prev, sidebarGroupLabelTextTransformL: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  <SelectItem value="uppercase">Uppercase</SelectItem>
                                  <SelectItem value="lowercase">Lowercase</SelectItem>
                                  <SelectItem value="capitalize">Capitalize</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Group Label Letter Spacing */}
                            <div className="space-y-2">
                              <Label htmlFor="sidebarGroupLabelLetterSpacingL" className="text-sm font-medium">
                                Letter Spacing
                              </Label>
                              <Select
                                value={sidebarColors.sidebarGroupLabelLetterSpacingL || '0.05em'}
                                onValueChange={(value) => setSidebarColors((prev: SidebarColors) => ({ ...prev, sidebarGroupLabelLetterSpacingL: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0em">Normal</SelectItem>
                                  <SelectItem value="0.025em">Tight</SelectItem>
                                  <SelectItem value="0.05em">Wide</SelectItem>
                                  <SelectItem value="0.1em">Extra Wide</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Group Label Padding */}
                            <div className="space-y-2">
                              <Label htmlFor="sidebarGroupLabelPaddingL" className="text-sm font-medium">
                                Padding
                              </Label>
                              <Select
                                value={sidebarColors.sidebarGroupLabelPaddingL || '0.5rem 0.75rem'}
                                onValueChange={(value) => setSidebarColors((prev: SidebarColors) => ({ ...prev, sidebarGroupLabelPaddingL: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0.25rem 0.5rem">Small</SelectItem>
                                  <SelectItem value="0.5rem 0.75rem">Medium</SelectItem>
                                  <SelectItem value="0.75rem 1rem">Large</SelectItem>
                                  <SelectItem value="1rem 1.25rem">Extra Large</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </TabsContent>
                        <TabsContent value="dark" className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium">Dark Theme Group Labels</h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resetSidebarColors('Dark')}
                              disabled={!canEdit}
                            >
                              <RotateCcw className="mr-2 h-3 w-3" />
                              Reset
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {/* Group Label Color */}
                            <div className="space-y-2">
                              <Label htmlFor="sidebarGroupLabelColorD" className="text-sm font-medium">
                                Label Color
                              </Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  id="sidebarGroupLabelColorD"
                                  type="text"
                                  value={sidebarColors.sidebarGroupLabelColorD || ''}
                                  onChange={e => setSidebarColors((prev: SidebarColors) => ({ ...prev, sidebarGroupLabelColorD: e.target.value }))}
                                  placeholder="210 25% 70%"
                                  className="text-sm"
                                />
                                <Input
                                  type="color"
                                  value={convertHslStringToHex(sidebarColors.sidebarGroupLabelColorD)}
                                  onChange={e => setSidebarColors((prev: SidebarColors) => ({ ...prev, sidebarGroupLabelColorD: hexToHslString(e.target.value) }))}
                                  className="w-10 h-9 p-1 rounded-md border"
                                />
                              </div>
                            </div>

                            {/* Group Label Font Size */}
                            <div className="space-y-2">
                              <Label htmlFor="sidebarGroupLabelFontSizeD" className="text-sm font-medium">
                                Font Size
                              </Label>
                              <Select
                                value={sidebarColors.sidebarGroupLabelFontSizeD || '0.75rem'}
                                onValueChange={(value) => setSidebarColors((prev: SidebarColors) => ({ ...prev, sidebarGroupLabelFontSizeD: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0.625rem">Extra Small (10px)</SelectItem>
                                  <SelectItem value="0.75rem">Small (12px)</SelectItem>
                                  <SelectItem value="0.875rem">Medium (14px)</SelectItem>
                                  <SelectItem value="1rem">Large (16px)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Group Label Font Weight */}
                            <div className="space-y-2">
                              <Label htmlFor="sidebarGroupLabelFontWeightD" className="text-sm font-medium">
                                Font Weight
                              </Label>
                              <Select
                                value={sidebarColors.sidebarGroupLabelFontWeightD || '500'}
                                onValueChange={(value) => setSidebarColors((prev: SidebarColors) => ({ ...prev, sidebarGroupLabelFontWeightD: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="400">Normal</SelectItem>
                                  <SelectItem value="500">Medium</SelectItem>
                                  <SelectItem value="600">Semi Bold</SelectItem>
                                  <SelectItem value="700">Bold</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Group Label Text Transform */}
                            <div className="space-y-2">
                              <Label htmlFor="sidebarGroupLabelTextTransformD" className="text-sm font-medium">
                                Text Transform
                              </Label>
                              <Select
                                value={sidebarColors.sidebarGroupLabelTextTransformD || 'uppercase'}
                                onValueChange={(value) => setSidebarColors((prev: SidebarColors) => ({ ...prev, sidebarGroupLabelTextTransformD: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  <SelectItem value="uppercase">Uppercase</SelectItem>
                                  <SelectItem value="lowercase">Lowercase</SelectItem>
                                  <SelectItem value="capitalize">Capitalize</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Group Label Letter Spacing */}
                            <div className="space-y-2">
                              <Label htmlFor="sidebarGroupLabelLetterSpacingD" className="text-sm font-medium">
                                Letter Spacing
                              </Label>
                              <Select
                                value={sidebarColors.sidebarGroupLabelLetterSpacingD || '0.05em'}
                                onValueChange={(value) => setSidebarColors((prev: SidebarColors) => ({ ...prev, sidebarGroupLabelLetterSpacingD: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0em">Normal</SelectItem>
                                  <SelectItem value="0.025em">Tight</SelectItem>
                                  <SelectItem value="0.05em">Wide</SelectItem>
                                  <SelectItem value="0.1em">Extra Wide</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Group Label Padding */}
                            <div className="space-y-2">
                              <Label htmlFor="sidebarGroupLabelPaddingD" className="text-sm font-medium">
                                Padding
                              </Label>
                              <Select
                                value={sidebarColors.sidebarGroupLabelPaddingD || '0.5rem 0.75rem'}
                                onValueChange={(value) => setSidebarColors((prev: SidebarColors) => ({ ...prev, sidebarGroupLabelPaddingD: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0.25rem 0.5rem">Small</SelectItem>
                                  <SelectItem value="0.5rem 0.75rem">Medium</SelectItem>
                                  <SelectItem value="0.75rem 1rem">Large</SelectItem>
                                  <SelectItem value="1rem 1.25rem">Extra Large</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>

                  {/* Primary Button Color */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Primary Button Color</CardTitle>
                      <CardDescription>Set the gradient color for all primary buttons independently from the sidebar active color.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div>
                          <Label htmlFor="primaryGradientStart">Gradient Start</Label>
                          <Input
                            id="primaryGradientStart"
                            type="text"
                            value={primaryGradientStart}
                            onChange={e => setPrimaryGradientStart(e.target.value)}
                            placeholder="179 67% 66%"
                            className="text-sm"
                          />
                          <Input
                            type="color"
                            value={convertHslStringToHex(primaryGradientStart)}
                            onChange={e => setPrimaryGradientStart(hexToHslString(e.target.value))}
                            className="w-10 h-9 p-1 rounded-md border mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="primaryGradientEnd">Gradient End</Label>
                          <Input
                            id="primaryGradientEnd"
                            type="text"
                            value={primaryGradientEnd}
                            onChange={e => setPrimaryGradientEnd(e.target.value)}
                            placeholder="238 74% 61%"
                            className="text-sm"
                          />
                          <Input
                            type="color"
                            value={convertHslStringToHex(primaryGradientEnd)}
                            onChange={e => setPrimaryGradientEnd(hexToHslString(e.target.value))}
                            className="w-10 h-9 p-1 rounded-md border mt-1"
                          />
                        </div>
                        <div className="flex flex-col items-center justify-end h-full">
                          <Label className="mb-1">Preview</Label>
                          <button
                            type="button"
                            className="btn-primary-gradient px-6 py-2 rounded-md border-none text-white font-semibold shadow"
                            style={{
                              backgroundImage: `linear-gradient(to right, hsl(${primaryGradientStart}), hsl(${primaryGradientEnd}))`,
                              color: '#fff',
                            }}
                            disabled
                          >
                            Primary Button
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
} 