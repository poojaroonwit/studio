"use client";

import React, { useEffect, useState, type ChangeEvent } from "react";
import { Loader2, Save, X, Palette, ImageUp, Trash2, XCircle, PenSquare, Sun, Moon, RotateCcw, Sidebar as SidebarIcon, LogIn, Settings2 } from "lucide-react";
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
import { setThemeAndColors, applySidebarStyles, getSidebarActiveStyle, setSidebarActiveStyle, type SidebarActiveStyle, applySidebarBackgroundSettings } from "@/lib/themeUtils";

import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { TiptapEditor } from '@/components/ui/wysiwyg-editors';

const DEFAULT_APP_NAME = "FitScan";
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
const LOGIN_PAGE_LOGO_SIZE_KEY = 'loginPageLogoSize';

type ThemePreference = "light" | "dark" | "system";
type LoginBackgroundType = 'image' | 'gradient' | 'solid';

// --- Sidebar color keys/types/utilities ---
const DEFAULT_PRIMARY_GRADIENT_START = "179 67% 66%";
const DEFAULT_PRIMARY_GRADIENT_END = "238 74% 61%";

// Add sidebar background type constants
const SIDEBAR_BACKGROUND_TYPE_KEY = 'sidebarBackgroundType';
const SIDEBAR_BACKGROUND_IMAGE_KEY = 'sidebarBackgroundImageUrl';
const SIDEBAR_BACKGROUND_IMAGE_FIT_KEY = 'sidebarBackgroundImageFit';
const SIDEBAR_BACKGROUND_IMAGE_POSITION_KEY = 'sidebarBackgroundImagePosition';

type SidebarBackgroundType = 'gradient' | 'solid' | 'image';
type SidebarImageFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
type SidebarImagePosition = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

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
  sidebarItemSpacingL: "0.5rem", sidebarGroupSpacingL: "1rem",
  sidebarPaddingXD: "0.75rem", sidebarPaddingYD: "0.5rem", sidebarMarginD: "0.25rem", sidebarGapD: "0.5rem",
  sidebarWidthD: "16rem", sidebarWidthCollapsedD: "3rem", sidebarTransitionDurationD: "0.2s", sidebarTransitionTimingD: "ease-in-out",
  sidebarItemSpacingD: "0.5rem", sidebarGroupSpacingD: "1rem",
  
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
  sidebarGroupLabelColorL: "220 25% 40%", sidebarGroupLabelFontSizeL: "0.75rem", sidebarGroupLabelFontWeightL: "600",
  sidebarGroupLabelTextTransformL: "uppercase", sidebarGroupLabelLetterSpacingL: "0.05em", sidebarGroupLabelPaddingL: "0.5rem 0.75rem",
  sidebarGroupLabelMarginL: "1rem 0 0.5rem 0",
  sidebarGroupLabelColorD: "210 30% 70%", sidebarGroupLabelFontSizeD: "0.75rem", sidebarGroupLabelFontWeightD: "600",
  sidebarGroupLabelTextTransformD: "uppercase", sidebarGroupLabelLetterSpacingD: "0.05em", sidebarGroupLabelPaddingD: "0.5rem 0.75rem",
  sidebarGroupLabelMarginD: "1rem 0 0.5rem 0",
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
  'sidebarItemSpacingL', 'sidebarGroupSpacingL', 'sidebarIconSizeL',
  'sidebarPaddingXD', 'sidebarPaddingYD', 'sidebarMarginD', 'sidebarGapD', 'sidebarWidthD', 'sidebarWidthCollapsedD', 'sidebarTransitionDurationD', 'sidebarTransitionTimingD',
  'sidebarItemSpacingD', 'sidebarGroupSpacingD', 'sidebarIconSizeD',
  
  // Menu item specific settings
  'sidebarMenuItemBgL', 'sidebarMenuItemBgHoverL', 'sidebarMenuItemBgActiveL', 'sidebarMenuItemColorL', 'sidebarMenuItemColorHoverL', 'sidebarMenuItemColorActiveL',
  'sidebarMenuItemBorderL', 'sidebarMenuItemBorderHoverL', 'sidebarMenuItemBorderActiveL', 'sidebarMenuItemBorderRadiusL', 'sidebarMenuItemPaddingXL', 'sidebarMenuItemPaddingYL',
  'sidebarMenuItemMarginL', 'sidebarMenuItemFontWeightL', 'sidebarMenuItemFontWeightActiveL', 'sidebarMenuItemFontSizeL', 'sidebarMenuItemLineHeightL', 'sidebarMenuItemTransitionL',
  'sidebarMenuItemBgD', 'sidebarMenuItemBgHoverD', 'sidebarMenuItemBgActiveD', 'sidebarMenuItemColorD', 'sidebarMenuItemColorHoverD', 'sidebarMenuItemColorActiveD',
  'sidebarMenuItemBorderD', 'sidebarMenuItemBorderHoverD', 'sidebarMenuItemBorderActiveD', 'sidebarMenuItemBorderRadiusD', 'sidebarMenuItemPaddingXD', 'sidebarMenuItemPaddingYD',
  'sidebarMenuItemMarginD', 'sidebarMenuItemFontWeightD', 'sidebarMenuItemFontWeightActiveD', 'sidebarMenuItemFontSizeD', 'sidebarMenuItemLineHeightD', 'sidebarMenuItemTransitionD',
  
  // Icon settings
  'sidebarIconColorL', 'sidebarIconColorHoverL', 'sidebarIconColorActiveL', 'sidebarIconMarginRightL', 'sidebarIconTransitionL',
  'sidebarIconColorD', 'sidebarIconColorHoverD', 'sidebarIconColorActiveD', 'sidebarIconMarginRightD', 'sidebarIconTransitionD',
  
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
  const { success, error: showError } = useToast();
  const [isClient, setIsClient] = useState(false);
  const { data: session, status: sessionStatus } = useSession();
  const [showLogoOnly, setShowLogoOnly] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();

  // Preferences state
  const [themePreference, setThemePreference] = useState<ThemePreference>(DEFAULT_THEME);
  const [appName, setAppName] = useState<string>(DEFAULT_APP_NAME);
  const [activeTab, setActiveTab] = useState('general');
  const [activeSidebarTab, setActiveSidebarTab] = useState('light');
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
  
  // Branding display settings
  const [sidebarLogoSize, setSidebarLogoSize] = useState<number>(48); // Default 48px (h-12 w-12)
  const [loginPageLogoSize, setLoginPageLogoSize] = useState<number>(100); // Default 100px for login page (reduced from 150px)
  
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

  // Add state for sidebar background customization
  const [sidebarBackgroundType, setSidebarBackgroundType] = useState<SidebarBackgroundType>('gradient');
  const [selectedSidebarImageFile, setSelectedSidebarImageFile] = useState<File | null>(null);
  const [sidebarImagePreviewUrl, setSidebarImagePreviewUrl] = useState<string | null>(null);
  const [savedSidebarImageUrl, setSavedSidebarImageUrl] = useState<string | null>(null);
  const [sidebarImageFit, setSidebarImageFit] = useState<SidebarImageFit>('cover');
  const [sidebarImagePosition, setSidebarImagePosition] = useState<SidebarImagePosition>('center');

  // Add state for primary button color
  const [primaryGradientStart, setPrimaryGradientStart] = useState<string>(DEFAULT_PRIMARY_GRADIENT_START);
  const [primaryGradientEnd, setPrimaryGradientEnd] = useState<string>(DEFAULT_PRIMARY_GRADIENT_END);

      const canEdit = session?.user?.role === "Admin";

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
          
          // Load branding display settings
          setShowLogoOnly(data.showLogoOnly === 'true' || data.showLogoOnly === true);
          setSidebarLogoSize(data.sidebarLogoSize ? parseInt(data.sidebarLogoSize) : 48);
          setLoginPageLogoSize(data[LOGIN_PAGE_LOGO_SIZE_KEY] ? parseInt(data[LOGIN_PAGE_LOGO_SIZE_KEY]) : 100);
          
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

          // Load sidebar background settings
          setSidebarBackgroundType((data[SIDEBAR_BACKGROUND_TYPE_KEY] as SidebarBackgroundType) || 'gradient');
          setSavedSidebarImageUrl(data[SIDEBAR_BACKGROUND_IMAGE_KEY] || null);
          setSidebarImagePreviewUrl(data[SIDEBAR_BACKGROUND_IMAGE_KEY] || null);
          setSidebarImageFit((data[SIDEBAR_BACKGROUND_IMAGE_FIT_KEY] as SidebarImageFit) || 'cover');
          setSidebarImagePosition((data[SIDEBAR_BACKGROUND_IMAGE_POSITION_KEY] as SidebarImagePosition) || 'center');

          // Initialize sidebar active style from backend or localStorage
          const backendSidebarStyle = data.sidebarActiveStylePreference;
          if (backendSidebarStyle) {
            setSidebarActiveStyle(backendSidebarStyle);
          } else {
            setSidebarActiveStyle(getSidebarActiveStyle());
          }

          // Load primary button colors
          setPrimaryGradientStart(data.primaryGradientStart || DEFAULT_PRIMARY_GRADIENT_START);
          setPrimaryGradientEnd(data.primaryGradientEnd || DEFAULT_PRIMARY_GRADIENT_END);

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
  }, [sessionStatus]);

  useEffect(() => {
    applySidebarStyles(sidebarColors);
  }, [sidebarColors]);

  // Apply sidebar background settings when they change
  useEffect(() => {
    applySidebarBackgroundSettings({
      sidebarBackgroundType,
      sidebarBackgroundImageUrl: savedSidebarImageUrl || undefined,
      sidebarBackgroundImageFit: sidebarImageFit,
      sidebarBackgroundImagePosition: sidebarImagePosition,
    });
  }, [sidebarBackgroundType, savedSidebarImageUrl, sidebarImageFit, sidebarImagePosition]);

  const handleLogoFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024 * 1024) { // 500MB limit
        showError('Logo file size must be less than 500MB');
        return;
      }
      setSelectedLogoFile(file);
      
      // Immediately show preview for instant feedback
      const previewUrl = URL.createObjectURL(file);
      setLogoPreviewUrl(previewUrl);
      
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
        setLogoPreviewUrl(url); // Update with MinIO URL
        
        // Immediately save the logo URL to the database
        const saveRes = await fetch('/api/settings/system-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([
            { key: 'appLogoDataUrl', value: url }
          ]),
        });
        
        if (saveRes.ok) {
          setSavedLogoUrl(url);
          setSelectedLogoFile(null);
          success('Logo uploaded and saved!');
        } else {
          throw new Error('Failed to save logo to database');
        }
      } catch (e: any) {
        showError(e.message || 'Failed to upload logo');
        // Clear preview on error
        setLogoPreviewUrl(null);
      }
    }
  };

  // Helper function to create logo upload handlers
  const createLogoUploadHandler = (
    setPreviewUrl: (url: string | null) => void,
    setSavedUrl: (url: string | null) => void,
    settingKey: string,
    successMessage: string
  ) => async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024 * 1024) { // 500MB limit
        showError('Logo file size must be less than 500MB');
        return;
      }
      
      // Immediately show preview for instant feedback
      const previewUrl = URL.createObjectURL(file);
      setPreviewUrl(previewUrl);
      
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
        setPreviewUrl(url); // Update with MinIO URL
        
        // Immediately save the logo URL to the database
        const saveRes = await fetch('/api/settings/system-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([
            { key: settingKey, value: url }
          ]),
        });
        
        if (saveRes.ok) {
          setSavedUrl(url);
          success(successMessage);
        } else {
          throw new Error('Failed to save logo to database');
        }
      } catch (e: any) {
        showError(e.message || 'Failed to upload logo');
        // Clear preview on error
        setPreviewUrl(null);
      }
    }
  };

  // Logo upload handlers for each variant
  const handleLoginPageLogoLightModeChange = createLogoUploadHandler(
    setLoginPageLogoLightModePreviewUrl,
    setSavedLoginPageLogoLightModeUrl,
    'loginPageLogoLightMode',
    'Login page light mode logo uploaded and saved!'
  );
  
  const handleLoginPageLogoDarkModeChange = createLogoUploadHandler(
    setLoginPageLogoDarkModePreviewUrl,
    setSavedLoginPageLogoDarkModeUrl,
    'loginPageLogoDarkMode',
    'Login page dark mode logo uploaded and saved!'
  );

  const handleSidebarLogoCollapsedLightModeChange = createLogoUploadHandler(
    setSidebarLogoCollapsedLightModePreviewUrl,
    setSavedSidebarLogoCollapsedLightModeUrl,
    'sidebarLogoCollapsedLightMode',
    'Sidebar collapsed light mode logo uploaded and saved!'
  );

  const handleSidebarLogoExpandedLightModeChange = createLogoUploadHandler(
    setSidebarLogoExpandedLightModePreviewUrl,
    setSavedSidebarLogoExpandedLightModeUrl,
    'sidebarLogoExpandedLightMode',
    'Sidebar expanded light mode logo uploaded and saved!'
  );

  const handleSidebarLogoCollapsedDarkModeChange = createLogoUploadHandler(
    setSidebarLogoCollapsedDarkModePreviewUrl,
    setSavedSidebarLogoCollapsedDarkModeUrl,
    'sidebarLogoCollapsedDarkMode',
    'Sidebar collapsed dark mode logo uploaded and saved!'
  );

  const handleSidebarLogoExpandedDarkModeChange = createLogoUploadHandler(
    setSidebarLogoExpandedDarkModePreviewUrl,
    setSavedSidebarLogoExpandedDarkModeUrl,
    'sidebarLogoExpandedDarkMode',
    'Sidebar expanded dark mode logo uploaded and saved!'
  );

  // Function to remove sidebar background image
  const removeSidebarBackgroundImage = async () => {
    try {
      // Remove from database
      const saveRes = await fetch('/api/settings/system-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          { key: SIDEBAR_BACKGROUND_IMAGE_KEY, value: null }
        ]),
      });
      
      if (saveRes.ok) {
        setSidebarImagePreviewUrl(null);
        setSavedSidebarImageUrl(null);
        success('Sidebar background image removed!');
      } else {
        throw new Error('Failed to remove sidebar background image from database');
      }
    } catch (e: any) {
      showError(e.message || 'Failed to remove sidebar background image');
    }
  };

  // Sidebar background image upload handler
  const handleSidebarImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024 * 1024) { // 500MB limit
        showError('Sidebar background image file size must be less than 500MB');
        return;
      }
      setSelectedSidebarImageFile(file);
      
      // Immediately show preview for instant feedback
      const previewUrl = URL.createObjectURL(file);
      setSidebarImagePreviewUrl(previewUrl);
      
      // Upload to MinIO
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/settings/upload-image', {
          method: 'PUT',
          body: formData,
        });
        if (!res.ok) throw new Error('Failed to upload sidebar background image');
        const { url } = await res.json();
        setSidebarImagePreviewUrl(url); // Update with MinIO URL
        
        // Immediately save the image URL to the database
        const saveRes = await fetch('/api/settings/system-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([
            { key: SIDEBAR_BACKGROUND_IMAGE_KEY, value: url }
          ]),
        });
        
        if (saveRes.ok) {
          setSavedSidebarImageUrl(url);
          setSelectedSidebarImageFile(null);
          success('Sidebar background image uploaded and saved!');
        } else {
          throw new Error('Failed to save sidebar background image to database');
        }
      } catch (e: any) {
        showError(e.message || 'Failed to upload sidebar background image');
        // Clear preview on error
        setSidebarImagePreviewUrl(null);
      }
    }
  };

  const handleFaviconFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) { // 1MB limit for favicon
        showError('Favicon file size must be less than 1MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        showError('Please select a valid image file for favicon');
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
        
        // Immediately save the favicon URL to the database
        const saveRes = await fetch('/api/settings/system-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([
            { key: 'appFaviconDataUrl', value: url }
          ]),
        });
        
        if (saveRes.ok) {
          setSavedFaviconUrl(url);
          setSelectedFaviconFile(null);
          success('Favicon uploaded and saved!');
        } else {
          throw new Error('Failed to save favicon to database');
        }
      } catch (e: any) {
        showError(e.message || 'Failed to upload favicon');
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

  const handleLoginImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024 * 1024) { // 500MB limit
        showError('Login background image must be less than 500MB');
        return;
      }
      setSelectedLoginImageFile(file);
      
      // Upload to MinIO
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/settings/upload-image', {
          method: 'PUT',
          body: formData,
        });
        if (!res.ok) throw new Error('Failed to upload login background image');
        const { url } = await res.json();
        setLoginImagePreviewUrl(url);
        
        // Immediately save the login background image URL to the database
        const saveRes = await fetch('/api/settings/system-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([
            { key: 'loginPageBackgroundImageUrl', value: url }
          ]),
        });
        
        if (saveRes.ok) {
          setSavedLoginImageDataUrl(url);
          setSelectedLoginImageFile(null);
          success('Login background image uploaded and saved!');
        } else {
          throw new Error('Failed to save login background image to database');
        }
      } catch (e: any) {
        showError(e.message || 'Failed to upload login background image');
        // Clear preview on error
        setLoginImagePreviewUrl(null);
      }
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
        // Branding display settings
        'showLogoOnly',
        'sidebarLogoSize',
        'loginPageLogoSize',
        'loginBackgroundType',
        'loginBackgroundGradientStart',
        'loginBackgroundGradientEnd',
        'loginBackgroundColor',
        'loginPageBackgroundImageUrl',
        'primaryGradientStart',
        'primaryGradientEnd',
        // Sidebar background settings
        'sidebarBackgroundType',
        'sidebarBackgroundImageUrl',
        'sidebarBackgroundImageFit',
        'sidebarBackgroundImagePosition',
        // Add all sidebar color keys
        ...Object.keys(sidebarColors)
      ];
      let settingsToSave = [
        { key: 'themePreference', value: themePreference },
        { key: 'appName', value: appName },
        { key: 'appLogoDataUrl', value: savedLogoUrl },
        { key: 'appFaviconDataUrl', value: savedFaviconUrl },
        // New contextual logo settings
        { key: 'loginPageLogoLightMode', value: savedLoginPageLogoLightModeUrl },
        { key: 'loginPageLogoDarkMode', value: savedLoginPageLogoDarkModeUrl },
        { key: 'sidebarLogoCollapsedLightMode', value: savedSidebarLogoCollapsedLightModeUrl },
        { key: 'sidebarLogoExpandedLightMode', value: savedSidebarLogoExpandedLightModeUrl },
        { key: 'sidebarLogoCollapsedDarkMode', value: savedSidebarLogoCollapsedDarkModeUrl },
        { key: 'sidebarLogoExpandedDarkMode', value: savedSidebarLogoExpandedDarkModeUrl },
        { key: 'showLogoOnly', value: showLogoOnly.toString() },
        { key: 'sidebarLogoSize', value: sidebarLogoSize.toString() },
        { key: 'loginPageLogoSize', value: loginPageLogoSize.toString() },
        { key: 'loginBackgroundType', value: loginBackgroundType },
        { key: 'loginBackgroundGradientStart', value: loginBackgroundGradientStart },
        { key: 'loginBackgroundGradientEnd', value: loginBackgroundGradientEnd },
        { key: 'loginBackgroundColor', value: loginBackgroundColor },
        { key: 'loginPageBackgroundImageUrl', value: savedLoginImageDataUrl },
        // Sidebar background settings
        { key: 'sidebarBackgroundType', value: sidebarBackgroundType },
        { key: 'sidebarBackgroundImageUrl', value: savedSidebarImageUrl },
        { key: 'sidebarBackgroundImageFit', value: sidebarImageFit },
        { key: 'sidebarBackgroundImagePosition', value: sidebarImagePosition },
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
      


      // Trigger favicon update
      window.dispatchEvent(new CustomEvent('faviconUpdated', {
        detail: { faviconDataUrl: savedFaviconUrl }
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

      // Apply sidebar background settings
      applySidebarBackgroundSettings({
        sidebarBackgroundType,
        sidebarBackgroundImageUrl: savedSidebarImageUrl || undefined,
        sidebarBackgroundImageFit: sidebarImageFit,
        sidebarBackgroundImagePosition: sidebarImagePosition,
      });
      
      // Dispatch event for real-time updates with sidebar colors and contextual logos
      window.dispatchEvent(new CustomEvent('appConfigChanged', {
        detail: {
          appName,
          logoUrl: savedLogoUrl,
          themePreference,
          primaryGradientStart: primaryGradientStart || sidebarColors.sidebarActiveBgStartL || DEFAULT_PRIMARY_GRADIENT_START,
          primaryGradientEnd: primaryGradientEnd || sidebarColors.sidebarActiveBgEndL || DEFAULT_PRIMARY_GRADIENT_END,
          sidebarColors,
          sidebarActiveStyle,
          sidebarLogoSize,
          contextualLogos: {
            sidebarLogoCollapsedLightMode: savedSidebarLogoCollapsedLightModeUrl,
            sidebarLogoExpandedLightMode: savedSidebarLogoExpandedLightModeUrl,
            sidebarLogoCollapsedDarkMode: savedSidebarLogoCollapsedDarkModeUrl,
            sidebarLogoExpandedDarkMode: savedSidebarLogoExpandedDarkModeUrl,
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
          {!showLogoOnly && (
            <h1 className="text-2xl font-bold text-foreground">System Preferences</h1>
          )}
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
        <div className="h-full flex flex-col">
          <div className="flex w-full border-b border-border/50 mb-6">
            <div
              onClick={() => setActiveTab('general')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'general'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <Settings2 className="h-4 w-4" />
              General
            </div>
            <div
              onClick={() => setActiveTab('appearance')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'appearance'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <Palette className="h-4 w-4" />
              Appearance
            </div>
            <div
              onClick={() => setActiveTab('branding')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'branding'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <ImageUp className="h-4 w-4" />
              Branding
            </div>
            <div
              onClick={() => setActiveTab('sidebar')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'sidebar'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <SidebarIcon className="h-4 w-4" />
              Sidebar
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === 'general' && (
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
                          placeholder="e.g., FitScan Pro"
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
                        <div className="space-y-2">
                          <Label htmlFor="theme-preference">Default Theme</Label>
                          <Select 
                            value={themePreference} 
                            onValueChange={(value) => setThemePreference(value as ThemePreference)}
                            disabled={!canEdit}
                          >
                            <SelectTrigger id="theme-preference" className="w-full">
                              <SelectValue placeholder="Select default theme" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="light">
                                <div className="flex items-center gap-2">
                                  <Sun className="h-4 w-4" />
                                  Light
                                </div>
                              </SelectItem>
                              <SelectItem value="dark">
                                <div className="flex items-center gap-2">
                                  <Moon className="h-4 w-4" />
                                  Dark
                                </div>
                              </SelectItem>
                              <SelectItem value="system">
                                <div className="flex items-center gap-2">
                                  <RotateCcw className="h-4 w-4" />
                                  System
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Users can still override this setting in their personal preferences
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            )}

            {activeTab === 'appearance' && (
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
                        <div className="space-y-2">
                          <Label htmlFor="background-type">Background Type</Label>
                          <Select 
                            value={loginBackgroundType} 
                            onValueChange={(value) => setLoginBackgroundType(value as LoginBackgroundType)}
                            disabled={!canEdit}
                          >
                            <SelectTrigger id="background-type" className="w-full">
                              <SelectValue placeholder="Select background type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gradient">Gradient</SelectItem>
                              <SelectItem value="image">Image</SelectItem>
                              <SelectItem value="solid">Solid Color</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
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
            )}

            {activeTab === 'branding' && (
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                                     {/* Logo Management */}
                   <Card>
                     <CardHeader>
                       <CardTitle className="flex items-center gap-2">
                         <ImageUp className="h-5 w-5 text-primary" />
                         Logo Management
                       </CardTitle>
                       <CardDescription>
                         Configure your company logos for different contexts throughout the application
                       </CardDescription>
                     </CardHeader>
                    <CardContent className="space-y-6">
                         {/* Primary Logo */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                               <div>
                            <Label className="text-base font-semibold">Primary Logo</Label>
                            <p className="text-sm text-muted-foreground">Main company branding used in header, favicon, and as fallback</p>
                               </div>
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            Required
                          </Badge>
                             </div>
                             
                                                 <div className="flex items-center gap-4">
                               {/* Logo Preview */}
                               <div className="flex-shrink-0">
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
                               className="cursor-pointer block"
                             >
                               <div className="w-32 h-20 bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:bg-muted/70 hover:border-muted-foreground/40 transition-colors">
                                   {logoPreviewUrl ? (
                                     <div className="relative group">
                                       <img
                                         src={logoPreviewUrl}
                                         alt="Primary logo preview"
                                       className="max-w-full max-h-full object-contain p-2 transition-transform group-hover:scale-105"
                                       />
                                       <Button
                                         size="icon"
                                         variant="ghost"
                                       className="absolute -top-2 -right-2 h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                                       onClick={(e) => {
                                         e.preventDefault();
                                         e.stopPropagation();
                                         removeSelectedLogo(true);
                                       }}
                                         disabled={!canEdit}
                                       >
                                         <X className="h-3 w-3" />
                                       </Button>
                                     </div>
                                   ) : (
                                   <div className="text-center text-muted-foreground">
                                     <ImageUp className="h-8 w-8 mx-auto mb-1 opacity-60" />
                                     <p className="text-xs">Click to upload</p>
                                     </div>
                                   )}
                                 </div>
                             </Label>
                               </div>
                               
                               {/* Upload Section */}
                           <div className="flex-1 space-y-2">
                             <p className="text-xs text-muted-foreground">
                               Recommended: 200x80px, max 500MB • PNG, JPG, or SVG format
                             </p>
                             </div>
                           </div>
                         </div>

                      <Separator />

                      {/* Contextual Logos */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                               <div>
                            <Label className="text-base font-semibold">Contextual Logos</Label>
                            <p className="text-sm text-muted-foreground">Specialized logos for different contexts and themes</p>
                               </div>
                          <Badge variant="outline">Optional</Badge>
                             </div>

                               {/* Login Page Logos */}
                        <div className="space-y-3">
                          <Label className="text-sm font-medium text-muted-foreground">Login Page</Label>
                          <div className="grid grid-cols-2 gap-4">
                                   {/* Light Mode */}
                             <div className="space-y-2">
                               <Label className="text-xs font-medium">Light Mode</Label>
                               <div className="flex items-center gap-3">
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
                                   className="cursor-pointer block"
                                 >
                                   <div className="w-20 h-12 bg-muted/50 rounded border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:bg-muted/70 hover:border-muted-foreground/40 transition-colors">
                                       {loginPageLogoLightModePreviewUrl ? (
                                         <div className="relative group">
                                           <img
                                             src={loginPageLogoLightModePreviewUrl}
                                             alt="Login light mode logo"
                                           className="max-w-full max-h-full object-contain p-1 transition-transform group-hover:scale-105"
                                           />
                                           <Button
                                             size="icon"
                                             variant="ghost"
                                           className="absolute -top-1 -right-1 h-4 w-4 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                                           onClick={(e) => {
                                             e.preventDefault();
                                             e.stopPropagation();
                                               setLoginPageLogoLightModePreviewUrl(null);
                                               setSavedLoginPageLogoLightModeUrl(null);
                                             }}
                                             disabled={!canEdit}
                                           >
                                             <X className="h-2.5 w-2.5" />
                                           </Button>
                                         </div>
                                       ) : (
                                       <ImageUp className="h-4 w-4 text-muted-foreground" />
                                       )}
                                     </div>
                                 </Label>
                               </div>
                             </div>

                                                         {/* Dark Mode */}
                             <div className="space-y-2">
                               <Label className="text-xs font-medium">Dark Mode</Label>
                               <div className="flex items-center gap-3">
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
                                   className="cursor-pointer block"
                                 >
                                   <div className="w-20 h-12 bg-muted/50 rounded border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:bg-muted/70 hover:border-muted-foreground/40 transition-colors">
                                       {loginPageLogoDarkModePreviewUrl ? (
                                         <div className="relative group">
                                           <img
                                             src={loginPageLogoDarkModePreviewUrl}
                                             alt="Login dark mode logo"
                                           className="max-w-full max-h-full object-contain p-1 transition-transform group-hover:scale-105"
                                           />
                                           <Button
                                             size="icon"
                                             variant="ghost"
                                           className="absolute -top-1 -right-1 h-4 w-4 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                                           onClick={(e) => {
                                             e.preventDefault();
                                             e.stopPropagation();
                                               setLoginPageLogoDarkModePreviewUrl(null);
                                               setSavedLoginPageLogoDarkModeUrl(null);
                                             }}
                                             disabled={!canEdit}
                                           >
                                             <X className="h-2.5 w-2.5" />
                                           </Button>
                                         </div>
                                       ) : (
                                       <ImageUp className="h-4 w-4 text-muted-foreground" />
                                       )}
                                     </div>
                                       </Label>
                                     </div>
                                   </div>
                                 </div>
                               </div>

                               {/* Sidebar Logos */}
                                   <div className="space-y-3">
                          <Label className="text-sm font-medium text-muted-foreground">Sidebar</Label>
                          <div className="grid grid-cols-2 gap-4">
                            {/* Light Mode */}
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Light Mode</Label>
                              <div className="space-y-2">
                                     <div className="flex items-center gap-3">
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
                                      className="cursor-pointer block"
                                    >
                                      <div className="w-20 h-12 bg-muted/50 rounded border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:bg-muted/70 hover:border-muted-foreground/40 transition-colors">
                                         {sidebarLogoCollapsedLightModePreviewUrl ? (
                                           <div className="relative group">
                                             <img
                                               src={sidebarLogoCollapsedLightModePreviewUrl}
                                               alt="Sidebar collapsed light logo"
                                               className="max-w-full max-h-full object-contain p-1 transition-transform group-hover:scale-105"
                                             />
                                             <Button
                                               size="icon"
                                               variant="ghost"
                                             className="absolute -top-1 -right-1 h-3 w-3 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                                             onClick={(e) => {
                                               e.preventDefault();
                                               e.stopPropagation();
                                                 setSidebarLogoCollapsedLightModePreviewUrl(null);
                                                 setSavedSidebarLogoCollapsedLightModeUrl(null);
                                               }}
                                               disabled={!canEdit}
                                             >
                                               <X className="h-2 w-2" />
                                             </Button>
                                           </div>
                                         ) : (
                                         <ImageUp className="h-3 w-3 text-muted-foreground" />
                                         )}
                                       </div>
                                   </Label>
                                   <span className="text-xs text-muted-foreground">Collapsed</span>
                                 </div>
                                                                 <div className="flex items-center gap-3">
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
                                     className="cursor-pointer block"
                                   >
                                     <div className="w-20 h-12 bg-muted/50 rounded border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:bg-muted/70 hover:border-muted-foreground/40 transition-colors">
                                         {sidebarLogoExpandedLightModePreviewUrl ? (
                                           <div className="relative group">
                                             <img
                                               src={sidebarLogoExpandedLightModePreviewUrl}
                                               alt="Sidebar expanded light logo"
                                               className="max-w-full max-h-full object-contain p-1 transition-transform group-hover:scale-105"
                                             />
                                             <Button
                                               size="icon"
                                               variant="ghost"
                                             className="absolute -top-1 -right-1 h-3 w-3 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                                             onClick={(e) => {
                                               e.preventDefault();
                                               e.stopPropagation();
                                                 setSidebarLogoExpandedLightModePreviewUrl(null);
                                                 setSavedSidebarLogoExpandedLightModeUrl(null);
                                               }}
                                               disabled={!canEdit}
                                             >
                                               <X className="h-2 w-2" />
                                             </Button>
                                           </div>
                                         ) : (
                                         <ImageUp className="h-3 w-3 text-muted-foreground" />
                                         )}
                                       </div>
                                   </Label>
                                   <span className="text-xs text-muted-foreground">Expanded</span>
                                 </div>
                              </div>
                            </div>

                            {/* Dark Mode */}
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Dark Mode</Label>
                              <div className="space-y-2">
                                                                 <div className="flex items-center gap-3">
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
                                     className="cursor-pointer block"
                                   >
                                     <div className="w-14 h-9 bg-muted/50 rounded border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:bg-muted/70 hover:border-muted-foreground/40 transition-colors">
                                         {sidebarLogoCollapsedDarkModePreviewUrl ? (
                                           <div className="relative group">
                                             <img
                                               src={sidebarLogoCollapsedDarkModePreviewUrl}
                                               alt="Sidebar collapsed dark logo"
                                               className="max-w-full max-h-full object-contain p-1 transition-transform group-hover:scale-105"
                                             />
                                             <Button
                                               size="icon"
                                               variant="ghost"
                                             className="absolute -top-1 -right-1 h-3 w-3 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                                             onClick={(e) => {
                                               e.preventDefault();
                                               e.stopPropagation();
                                                 setSidebarLogoCollapsedDarkModePreviewUrl(null);
                                                 setSavedSidebarLogoCollapsedDarkModeUrl(null);
                                               }}
                                               disabled={!canEdit}
                                             >
                                               <X className="h-2 w-2" />
                                             </Button>
                                           </div>
                                         ) : (
                                         <ImageUp className="h-3 w-3 text-muted-foreground" />
                                         )}
                                       </div>
                                   </Label>
                                   <span className="text-xs text-muted-foreground">Collapsed</span>
                                 </div>
                                                                 <div className="flex items-center gap-3">
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
                                     className="cursor-pointer block"
                                   >
                                     <div className="w-20 h-12 bg-muted/50 rounded border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:bg-muted/70 hover:border-muted-foreground/40 transition-colors">
                                         {sidebarLogoExpandedDarkModePreviewUrl ? (
                                           <div className="relative group">
                                             <img
                                               src={sidebarLogoExpandedDarkModePreviewUrl}
                                               alt="Sidebar expanded dark logo"
                                               className="max-w-full max-h-full object-contain p-1 transition-transform group-hover:scale-105"
                                             />
                                             <Button
                                               size="icon"
                                               variant="ghost"
                                             className="absolute -top-1 -right-1 h-3 w-3 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                                             onClick={(e) => {
                                               e.preventDefault();
                                               e.stopPropagation();
                                                 setSidebarLogoExpandedDarkModePreviewUrl(null);
                                                 setSavedSidebarLogoExpandedDarkModeUrl(null);
                                               }}
                                               disabled={!canEdit}
                                             >
                                               <X className="h-2 w-2" />
                                             </Button>
                                           </div>
                                         ) : (
                                         <ImageUp className="h-3 w-3 text-muted-foreground" />
                                         )}
                                       </div>
                                         </Label>
                                   <span className="text-xs text-muted-foreground">Expanded</span>
                                 </div>
                               </div>
                             </div>
                           </div>
                         </div>
                       </div>
                       
                      {/* Branding Display Settings */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-semibold">Display Settings</Label>
                            <p className="text-sm text-muted-foreground">Configure how logos and application names are displayed</p>
                          </div>
                          <Badge variant="outline">Optional</Badge>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="show-logo-only"
                              checked={showLogoOnly}
                              onChange={(e) => setShowLogoOnly(e.target.checked)}
                              disabled={!canEdit}
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="show-logo-only" className="text-sm font-medium">
                              Show logo only (hide application name)
                            </Label>
                          </div>
                          <p className="text-xs text-muted-foreground ml-6">
                            When enabled, only the logo will be displayed on the login page and sidebar navigation, without the application name.
                          </p>
                          
                          {/* Logo Size Adjustment - Only show when "Show logo only" is enabled */}
                          {showLogoOnly && (
                            <div className="space-y-3 ml-6">
                              <div className="space-y-2">
                                <Label htmlFor="sidebar-logo-size" className="text-sm font-medium">
                                  Sidebar Logo Size
                                </Label>
                                <div className="flex items-center gap-4">
                                  <Input
                                    id="sidebar-logo-size"
                                    type="range"
                                    min="24"
                                    max="500"
                                    step="8"
                                    value={sidebarLogoSize}
                                    onChange={(e) => setSidebarLogoSize(parseInt(e.target.value))}
                                    disabled={!canEdit}
                                    className="flex-1"
                                  />
                                  <div className="flex items-center gap-2 min-w-[60px]">
                                    <span className="text-sm font-mono">{sidebarLogoSize}px</span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-center p-4 bg-muted/30 rounded-lg border">
                                  <div 
                                    className="bg-background border rounded-lg p-2 flex items-center justify-center"
                                    style={{ 
                                      width: `${Math.min(sidebarLogoSize, 200)}px`, 
                                      height: `${Math.min(sidebarLogoSize, 200)}px`,
                                      transform: sidebarLogoSize > 200 ? `scale(${200 / sidebarLogoSize})` : 'scale(1)',
                                      transformOrigin: 'center'
                                    }}
                                  >
                                    {logoPreviewUrl ? (
                                      <img
                                        src={logoPreviewUrl}
                                        alt="Logo size preview"
                                        className="max-w-full max-h-full object-contain"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 bg-muted rounded" />
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Adjust the size of the logo in the sidebar. Range: 24px - 500px. In collapsed mode, logos larger than 64px will be scaled down to fit.
                                </p>
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="login-logo-size" className="text-sm font-medium">
                                  Login Page Logo Size
                                </Label>
                                <div className="flex items-center gap-4">
                                  <Input
                                    id="login-logo-size"
                                    type="range"
                                    min="50"
                                    max="300"
                                    step="10"
                                    value={loginPageLogoSize}
                                    onChange={(e) => setLoginPageLogoSize(parseInt(e.target.value))}
                                    disabled={!canEdit}
                                    className="flex-1"
                                  />
                                  <div className="flex items-center gap-2 min-w-[60px]">
                                    <span className="text-sm font-mono">{loginPageLogoSize}px</span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-center p-4 bg-muted/30 rounded-lg border">
                                  <div 
                                    className="bg-background border rounded-lg p-2 flex items-center justify-center"
                                    style={{ 
                                      width: `${Math.min(loginPageLogoSize, 200)}px`, 
                                      height: `${Math.min(loginPageLogoSize, 200)}px`,
                                      transform: loginPageLogoSize > 200 ? `scale(${200 / loginPageLogoSize})` : 'scale(1)',
                                      transformOrigin: 'center'
                                    }}
                                  >
                                    {logoPreviewUrl ? (
                                      <img
                                        src={logoPreviewUrl}
                                        alt="Login logo size preview"
                                        className="max-w-full max-h-full object-contain"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 bg-muted rounded" />
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Adjust the size of the logo on the login page. Range: 50px - 300px. Default: 100px.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Usage Guide */}
                      <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
                         <div className="flex items-start gap-3">
                          <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                            <div className="h-2 w-2 rounded-full bg-primary"></div>
                           </div>
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">Usage Guide:</span> Primary logo is used in header, favicon, and as fallback. Contextual logos override primary for specific contexts and themes.
                           </div>
                         </div>
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
                           {/* Favicon Preview */}
                           <div className="flex-shrink-0">
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
                               className="cursor-pointer block"
                             >
                               <div className="w-16 h-16 bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:bg-muted/70 hover:border-muted-foreground/40 transition-colors">
                                 {faviconPreviewUrl ? (
                                   <div className="relative group">
                              <img
                                src={faviconPreviewUrl}
                                alt="Favicon preview"
                                       className="max-w-full max-h-full object-contain p-2 transition-transform group-hover:scale-105"
                              />
                              <Button
                                size="icon"
                                       variant="ghost"
                                       className="absolute -top-2 -right-2 h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                                       onClick={(e) => {
                                         e.preventDefault();
                                         e.stopPropagation();
                                         clearFaviconSelection();
                                       }}
                                disabled={!canEdit}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                                 ) : (
                                   <div className="text-center text-muted-foreground">
                                     <ImageUp className="h-6 w-6 mx-auto mb-1 opacity-60" />
                                     <p className="text-xs">Click to upload</p>
                                   </div>
                                 )}
                               </div>
                            </Label>
                           </div>
                           
                           {/* Upload Section */}
                           <div className="flex-1 space-y-2">
                             <p className="text-xs text-muted-foreground">
                               Recommended: 32x32px, max 1MB • PNG, JPG, or ICO format
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            )}

            {activeTab === 'sidebar' && (
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  
                  {/* Sidebar Background */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <SidebarIcon className="h-5 w-5 text-primary" />
                        Sidebar Background
                      </CardTitle>
                      <CardDescription>
                        Choose between gradient, solid color, or image background for the sidebar
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Background Type */}
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="sidebar-background-type">Background Type</Label>
                          <Select 
                            value={sidebarBackgroundType} 
                            onValueChange={(value) => setSidebarBackgroundType(value as SidebarBackgroundType)}
                            disabled={!canEdit}
                          >
                            <SelectTrigger id="sidebar-background-type" className="w-full">
                              <SelectValue placeholder="Select background type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gradient">Gradient</SelectItem>
                              <SelectItem value="solid">Solid Color</SelectItem>
                              <SelectItem value="image">Image</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Background Image */}
                      {sidebarBackgroundType === 'image' && (
                        <div className="space-y-3">
                          <Label>Background Image</Label>
                          <div className="flex items-center gap-4">
                            {sidebarImagePreviewUrl && (
                              <div className="relative">
                                <img
                                  src={sidebarImagePreviewUrl}
                                  alt="Sidebar background preview"
                                  className="w-32 h-20 object-cover rounded-md border"
                                />
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  className="absolute -top-2 -right-2 h-6 w-6"
                                  onClick={removeSidebarBackgroundImage}
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
                                onChange={handleSidebarImageFileChange}
                                disabled={!canEdit}
                                className="hidden"
                                id="sidebar-bg-upload"
                              />
                              <Label
                                htmlFor="sidebar-bg-upload"
                                className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                              >
                                <ImageUp className="mr-2 h-4 w-4" />
                                Upload Image
                              </Label>
                              <p className="text-xs text-muted-foreground mt-1">
                                Recommended: 256x1024, max 500MB
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Image Fit and Position */}
                      {sidebarBackgroundType === 'image' && sidebarImagePreviewUrl && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="sidebar-image-fit">Image Fit</Label>
                            <Select 
                              value={sidebarImageFit} 
                              onValueChange={(value) => setSidebarImageFit(value as SidebarImageFit)}
                              disabled={!canEdit}
                            >
                              <SelectTrigger id="sidebar-image-fit" className="w-full">
                                <SelectValue placeholder="Select image fit" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cover">Cover</SelectItem>
                                <SelectItem value="contain">Contain</SelectItem>
                                <SelectItem value="fill">Fill</SelectItem>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="scale-down">Scale Down</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="sidebar-image-position">Image Position</Label>
                            <Select 
                              value={sidebarImagePosition} 
                              onValueChange={(value) => setSidebarImagePosition(value as SidebarImagePosition)}
                              disabled={!canEdit}
                            >
                              <SelectTrigger id="sidebar-image-position" className="w-full">
                                <SelectValue placeholder="Select image position" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="center">Center</SelectItem>
                                <SelectItem value="top">Top</SelectItem>
                                <SelectItem value="bottom">Bottom</SelectItem>
                                <SelectItem value="left">Left</SelectItem>
                                <SelectItem value="right">Right</SelectItem>
                                <SelectItem value="top-left">Top Left</SelectItem>
                                <SelectItem value="top-right">Top Right</SelectItem>
                                <SelectItem value="bottom-left">Bottom Left</SelectItem>
                                <SelectItem value="bottom-right">Bottom Right</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {/* Preview */}
                      <div className="space-y-2">
                        <Label>Preview</Label>
                        <div className="w-full h-32 bg-muted/30 rounded-lg border flex items-center justify-center relative overflow-hidden">
                          {sidebarBackgroundType === 'gradient' && (
                            <div 
                              className="w-full h-full"
                              style={{
                                background: `linear-gradient(135deg, hsl(${sidebarColors.sidebarBgStartL}), hsl(${sidebarColors.sidebarBgEndL}))`
                              }}
                            />
                          )}
                          {sidebarBackgroundType === 'solid' && (
                            <div 
                              className="w-full h-full"
                              style={{
                                backgroundColor: `hsl(${sidebarColors.sidebarBgStartL})`
                              }}
                            />
                          )}
                          {sidebarBackgroundType === 'image' && sidebarImagePreviewUrl && (
                            <div 
                              className="w-full h-full"
                              style={{
                                backgroundImage: `url(${sidebarImagePreviewUrl})`,
                                backgroundSize: sidebarImageFit,
                                backgroundPosition: sidebarImagePosition,
                                backgroundRepeat: 'no-repeat'
                              }}
                            />
                          )}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                              Sidebar Preview
                            </span>
                          </div>
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
                       <div className="space-y-6">
                         <div className="flex w-full border-b border-border/50">
                           <div
                             onClick={() => setActiveSidebarTab('light')}
                             className={cn(
                               "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                               activeSidebarTab === 'light'
                                 ? "text-primary border-b-2 border-primary"
                                 : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                             )}
                           >
                             <Sun className="h-4 w-4" />
                             Light Theme
                           </div>
                           <div
                             onClick={() => setActiveSidebarTab('dark')}
                             className={cn(
                               "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                               activeSidebarTab === 'dark'
                                 ? "text-primary border-b-2 border-primary"
                                 : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                             )}
                           >
                             <Moon className="h-4 w-4" />
                             Dark Theme
                           </div>
                         </div>

                         {activeSidebarTab === 'light' && (
                           <div className="space-y-4">
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
                           </div>
                         )}

                         {activeSidebarTab === 'dark' && (
                           <div className="space-y-4">
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
                           </div>
                         )}
                       </div>
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 