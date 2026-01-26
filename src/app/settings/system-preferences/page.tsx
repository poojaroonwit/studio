
"use client";

import React, { useEffect, useState, useRef, useCallback, type ChangeEvent } from "react";
import { Loader2, Save, Palette, ImageUp, RotateCcw, Sidebar as SidebarIcon, Settings2, Target } from "lucide-react";
import { useSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { toast } from 'react-hot-toast';
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { setThemeAndColors, applySidebarStyles, getSidebarActiveStyle, setSidebarActiveStyle as setSidebarActiveStyleTheme, type SidebarActiveStyle, applySidebarBackgroundSettings, cleanupSidebarBackground } from "@/lib/themeUtils";

import { GeneralTab } from "@/components/settings/system-preferences/GeneralTab";
import { AppearanceTab } from "@/components/settings/system-preferences/AppearanceTab";
import { BrandingTab } from "@/components/settings/system-preferences/BrandingTab";
import { SidebarTab } from "@/components/settings/system-preferences/SidebarTab";
import { EvaluateTab } from "@/components/settings/system-preferences/EvaluateTab";

import {
  DEFAULT_APP_NAME,
  APP_THEME_KEY,
  APP_NAME_KEY,
  GENERATIVE_AI_CANVAS_MODE_KEY,
  LOGIN_BACKGROUND_TYPE_KEY,
  LOGIN_BACKGROUND_IMAGE_KEY,
  LOGIN_BACKGROUND_GRADIENT_START_KEY,
  LOGIN_BACKGROUND_GRADIENT_END_KEY,
  LOGIN_BACKGROUND_COLOR_KEY,
  LOGIN_PAGE_LOGO_SIZE_KEY,
  EVALUATE_HEADER_BACKGROUND_TYPE_KEY,
  EVALUATE_HEADER_BACKGROUND_IMAGE_KEY,
  EVALUATE_HEADER_BACKGROUND_GRADIENT_START_KEY,
  EVALUATE_HEADER_BACKGROUND_GRADIENT_END_KEY,
  EVALUATE_HEADER_BACKGROUND_COLOR_KEY,
  EVALUATE_HEADER_TEXT_COLOR_KEY,
  EVALUATE_PLATFORM_LOGO_DATA_URL_KEY,
  EVALUATE_REPORT_LOGO_DATA_URL_KEY,
  ThemePreference,
  LoginBackgroundType,
  EvaluateHeaderBackgroundType,
  DEFAULT_PRIMARY_GRADIENT_START,
  DEFAULT_PRIMARY_GRADIENT_END,
  SIDEBAR_BACKGROUND_TYPE_KEY,
  SIDEBAR_BACKGROUND_IMAGE_KEY,
  SIDEBAR_BACKGROUND_IMAGE_FIT_KEY,
  SIDEBAR_BACKGROUND_IMAGE_POSITION_KEY,
  SidebarBackgroundType,
  SidebarImageFit,
  SidebarImagePosition,
  DEFAULT_SIDEBAR_COLORS_BASE,
  SIDEBAR_COLOR_KEYS,
  createInitialSidebarColors,
  DEFAULT_LOGIN_BACKGROUND_TYPE,
  DEFAULT_LOGIN_BACKGROUND_GRADIENT_START,
  DEFAULT_LOGIN_BACKGROUND_GRADIENT_END,
  DEFAULT_LOGIN_BACKGROUND_COLOR,
  DEFAULT_EVALUATE_HEADER_BACKGROUND_TYPE,
  DEFAULT_EVALUATE_HEADER_BACKGROUND_GRADIENT_START,
  DEFAULT_EVALUATE_HEADER_BACKGROUND_GRADIENT_END,
  DEFAULT_EVALUATE_HEADER_BACKGROUND_COLOR,
  DEFAULT_EVALUATE_HEADER_TEXT_COLOR,
  DRAWER_STYLE_KEY,
  DrawerStyle,
  DEFAULT_DRAWER_STYLE,
  SidebarColors
} from "@/components/settings/system-preferences/constants";

import { hslGradientToGradientString, gradientStringToHslGradient } from "@/components/settings/system-preferences/utils";

// Initialize default theme constant
const DEFAULT_THEME: ThemePreference = "system";

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

  // App Favicon state
  const [selectedFaviconFile, setSelectedFaviconFile] = useState<File | null>(null);
  const [faviconPreviewUrl, setFaviconPreviewUrl] = useState<string | null>(null);
  const [savedFaviconUrl, setSavedFaviconUrl] = useState<string | null>(null);

  // Login page design state
  const [loginBackgroundType, setLoginBackgroundType] = useState<LoginBackgroundType>(DEFAULT_LOGIN_BACKGROUND_TYPE);
  const [selectedLoginImageFile, setSelectedLoginImageFile] = useState<File | null>(null);
  const [loginImagePreviewUrl, setLoginImagePreviewUrl] = useState<string | null>(null);
  const [savedLoginImageDataUrl, setSavedLoginImageDataUrl] = useState<string | null>(null);
  const [loginBackgroundGradient, setLoginBackgroundGradient] = useState<string | null>(null); // Full gradient string with all stops
  const [loginBackgroundColor, setLoginBackgroundColor] = useState<string>(DEFAULT_LOGIN_BACKGROUND_COLOR);

  // Evaluate page header background state
  const [evaluateHeaderBackgroundType, setEvaluateHeaderBackgroundType] = useState<EvaluateHeaderBackgroundType>(DEFAULT_EVALUATE_HEADER_BACKGROUND_TYPE);
  const [selectedEvaluateHeaderImageFile, setSelectedEvaluateHeaderImageFile] = useState<File | null>(null);
  const [evaluateHeaderImagePreviewUrl, setEvaluateHeaderImagePreviewUrl] = useState<string | null>(null);
  const [savedEvaluateHeaderImageDataUrl, setSavedEvaluateHeaderImageDataUrl] = useState<string | null>(null);
  const [evaluateHeaderBackgroundGradient, setEvaluateHeaderBackgroundGradient] = useState<string | null>(null); // Full gradient string with all stops
  const [evaluateHeaderBackgroundColor, setEvaluateHeaderBackgroundColor] = useState<string>(DEFAULT_EVALUATE_HEADER_BACKGROUND_COLOR);
  const [evaluateHeaderTextColor, setEvaluateHeaderTextColor] = useState<string>(DEFAULT_EVALUATE_HEADER_TEXT_COLOR);

  // Evaluate platform logo state
  const [evaluatePlatformLogoPreviewUrl, setEvaluatePlatformLogoPreviewUrl] = useState<string | null>(null);
  const [savedEvaluatePlatformLogoUrl, setSavedEvaluatePlatformLogoUrl] = useState<string | null>(null);
  const [evaluateReportLogoPreviewUrl, setEvaluateReportLogoPreviewUrl] = useState<string | null>(null);
  const [savedEvaluateReportLogoUrl, setSavedEvaluateReportLogoUrl] = useState<string | null>(null);


  // Loading/saving/error
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sidebar color state
  const [sidebarColors, setSidebarColors] = useState<SidebarColors>(DEFAULT_SIDEBAR_COLORS_BASE);
  const [sidebarActiveStyle, setSidebarActiveStyle] = useState<SidebarActiveStyle>('gradient');

  // Add state for sidebar background customization
  const [sidebarBackgroundType, setSidebarBackgroundType] = useState<SidebarBackgroundType>('gradient');
  const [selectedSidebarImageFile, setSelectedSidebarImageFile] = useState<File | null>(null);
  const [sidebarImagePreviewUrl, setSidebarImagePreviewUrl] = useState<string | null>(null);
  const [savedSidebarImageUrl, setSavedSidebarImageUrl] = useState<string | null>(null);
  const [sidebarImageFit, setSidebarImageFit] = useState<SidebarImageFit>('cover');
  const [sidebarImagePosition, setSidebarImagePosition] = useState<SidebarImagePosition>('center');

  // Generative AI Canvas Mode setting
  const [generativeAICanvasMode, setGenerativeAICanvasMode] = useState<boolean>(false);

  // Drawer style setting
  const [drawerStyle, setDrawerStyle] = useState<DrawerStyle>(DEFAULT_DRAWER_STYLE);

  const canEdit = session?.user?.role === "Admin" ||
    (session?.user?.modulePermissions && session.user.modulePermissions.includes('SYSTEM_SETTINGS_EDIT'));

  // Refs for cleanup and resource management
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set());

  // Cleanup function for object URLs
  const cleanupObjectUrls = useCallback(() => {
    objectUrlsRef.current.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        // Ignore errors when revoking URLs
      }
    });
    objectUrlsRef.current.clear();
  }, []);

  // Helper to create and track object URLs
  const createTrackedObjectUrl = useCallback((file: File): string => {
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.add(url);
    return url;
  }, []);

  // Helper for immediate image upload
  const uploadImage = async (file: File, type: string, loadingMessage: string): Promise<string | null> => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return null;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showError('File size must be less than 5MB');
      return null;
    }

    try {
      // Show loading state
      const loadingToast = toast.loading(loadingMessage);

      // Upload to MinIO first
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('type', type);

      const uploadRes = await fetch('/api/upload-image', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const uploadData = await uploadRes.json();
      const logoUrl = uploadData.url || uploadData.file?.url;

      if (!logoUrl) {
        throw new Error('No URL returned from upload');
      }

      toast.success('Image uploaded successfully', { id: loadingToast });
      return logoUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
      showError(`Error uploading image: ${errorMessage}`);
      return null;
    }
  };

  const handleLogoFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = await uploadImage(file, 'app-logo', 'Uploading primary logo...');
      
      if (url) {
        setSelectedLogoFile(null); // Clear file since it's uploaded
        setLogoPreviewUrl(url);
        setSavedLogoUrl(url);
      }
      e.target.value = ''; // Reset input
    }
  };

  const removeSelectedLogo = (shouldRemoveSaved: boolean) => {
    setSelectedLogoFile(null);
    if (logoPreviewUrl && objectUrlsRef.current.has(logoPreviewUrl)) {
      URL.revokeObjectURL(logoPreviewUrl);
      objectUrlsRef.current.delete(logoPreviewUrl);
    }

    if (shouldRemoveSaved) {
      setSavedLogoUrl(null);
      setLogoPreviewUrl(null);
    } else {
      setLogoPreviewUrl(savedLogoUrl);
    }
  };

  // --- Handlers for contextual logos ---
  const handleLoginPageLogoLightModeChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = await uploadImage(file, 'settings', 'Uploading login page logo (light)...');
      if (url) {
        setLoginPageLogoLightModePreviewUrl(url);
        setSavedLoginPageLogoLightModeUrl(url);
      }
      e.target.value = '';
    }
  };

  const handleLoginPageLogoDarkModeChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = await uploadImage(file, 'settings', 'Uploading login page logo (dark)...');
      if (url) {
        setLoginPageLogoDarkModePreviewUrl(url);
        setSavedLoginPageLogoDarkModeUrl(url);
      }
      e.target.value = '';
    }
  };

  const handleSidebarLogoCollapsedLightModeChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = await uploadImage(file, 'settings', 'Uploading sidebar collapsed logo (light)...');
      if (url) {
        setSidebarLogoCollapsedLightModePreviewUrl(url);
        setSavedSidebarLogoCollapsedLightModeUrl(url);
      }
      e.target.value = '';
    }
  };

  const handleSidebarLogoExpandedLightModeChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = await uploadImage(file, 'settings', 'Uploading sidebar expanded logo (light)...');
      if (url) {
        setSidebarLogoExpandedLightModePreviewUrl(url);
        setSavedSidebarLogoExpandedLightModeUrl(url);
      }
      e.target.value = '';
    }
  };

  const handleSidebarLogoCollapsedDarkModeChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = await uploadImage(file, 'settings', 'Uploading sidebar collapsed logo (dark)...');
      if (url) {
        setSidebarLogoCollapsedDarkModePreviewUrl(url);
        setSavedSidebarLogoCollapsedDarkModeUrl(url);
      }
      e.target.value = '';
    }
  };

  const handleSidebarLogoExpandedDarkModeChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = await uploadImage(file, 'settings', 'Uploading sidebar expanded logo (dark)...');
      if (url) {
        setSidebarLogoExpandedDarkModePreviewUrl(url);
        setSavedSidebarLogoExpandedDarkModeUrl(url);
      }
      e.target.value = '';
    }
  };

  // --- Handlers for Login Background Image ---
  const handleLoginImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedLoginImageFile(file);
      const url = createTrackedObjectUrl(file);
      setLoginImagePreviewUrl(url);
    }
  };

  const removeSelectedLoginImage = (shouldRemoveSaved: boolean) => {
    setSelectedLoginImageFile(null);
    if (loginImagePreviewUrl && objectUrlsRef.current.has(loginImagePreviewUrl)) {
      URL.revokeObjectURL(loginImagePreviewUrl);
      objectUrlsRef.current.delete(loginImagePreviewUrl);
    }

    if (shouldRemoveSaved) {
      setSavedLoginImageDataUrl(null);
      setLoginImagePreviewUrl(null);
    } else {
      setLoginImagePreviewUrl(savedLoginImageDataUrl);
    }
  };

  // --- Handlers for Evaluate Header Image ---
  const handleEvaluateHeaderImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedEvaluateHeaderImageFile(file);
      const url = createTrackedObjectUrl(file);
      setEvaluateHeaderImagePreviewUrl(url);
    }
  };

  const removeSelectedEvaluateHeaderImage = (shouldRemoveSaved: boolean) => {
    setSelectedEvaluateHeaderImageFile(null);
    if (evaluateHeaderImagePreviewUrl && objectUrlsRef.current.has(evaluateHeaderImagePreviewUrl)) {
      URL.revokeObjectURL(evaluateHeaderImagePreviewUrl);
      objectUrlsRef.current.delete(evaluateHeaderImagePreviewUrl);
    }

    if (shouldRemoveSaved) {
      setSavedEvaluateHeaderImageDataUrl(null);
      setEvaluateHeaderImagePreviewUrl(null);
    } else {
      setEvaluateHeaderImagePreviewUrl(savedEvaluateHeaderImageDataUrl);
    }
  };


  // --- Handlers for Sidebar Background Image ---
  const handleSidebarImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedSidebarImageFile(file);
      const url = createTrackedObjectUrl(file);
      setSidebarImagePreviewUrl(url);
    }
  };

  const removeSelectedSidebarImage = (shouldRemoveSaved: boolean) => {
    setSelectedSidebarImageFile(null);
    if (sidebarImagePreviewUrl && objectUrlsRef.current.has(sidebarImagePreviewUrl)) {
      URL.revokeObjectURL(sidebarImagePreviewUrl);
      objectUrlsRef.current.delete(sidebarImagePreviewUrl);
    }

    if (shouldRemoveSaved) {
      setSavedSidebarImageUrl(null);
      setSidebarImagePreviewUrl(null);
    } else {
      setSidebarImagePreviewUrl(savedSidebarImageUrl);
    }
  };

  const resetSidebarColors = (theme: 'Light' | 'Dark') => {
    const newSidebarColors = createInitialSidebarColors();
    setSidebarColors(newSidebarColors);
    applySidebarStyles(newSidebarColors);
  }

  // Effect to load preferences
  useEffect(() => {
    isMountedRef.current = true;
    setIsClient(true);
    if (sessionStatus === 'unauthenticated') {
      signIn(undefined, { callbackUrl: pathname });
    } else if (sessionStatus === 'authenticated') {
      // Fetch from backend
      async function fetchPrefs() {
        if (!isMountedRef.current) return;
        // Cancel any existing request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        // Create new abort controller
        abortControllerRef.current = new AbortController();

        setLoading(true);
        setErrorMsg(null);
        try {
          const res = await fetch('/api/settings/system-settings', {
            signal: abortControllerRef.current.signal
          });
          if (!res.ok) throw new Error('Failed to load system preferences');
          const data = await res.json();

          if (!isMountedRef.current) return;
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

          // Load login page design settings
          setLoginBackgroundType((data[LOGIN_BACKGROUND_TYPE_KEY] as LoginBackgroundType) || DEFAULT_LOGIN_BACKGROUND_TYPE);
          setSavedLoginImageDataUrl(data[LOGIN_BACKGROUND_IMAGE_KEY] || null);
          setLoginImagePreviewUrl(data[LOGIN_BACKGROUND_IMAGE_KEY] || null);
          // Load full gradient string, or construct from legacy start/end if needed
          const loginFullGradient = data['loginBackgroundGradient'];
          if (loginFullGradient) {
            setLoginBackgroundGradient(loginFullGradient);
          } else if (data[LOGIN_BACKGROUND_GRADIENT_START_KEY] && data[LOGIN_BACKGROUND_GRADIENT_END_KEY]) {
            // Legacy: construct from start/end for backward compatibility
            setLoginBackgroundGradient(hslGradientToGradientString(
              data[LOGIN_BACKGROUND_GRADIENT_START_KEY],
              data[LOGIN_BACKGROUND_GRADIENT_END_KEY]
            ));
          } else {
            setLoginBackgroundGradient(hslGradientToGradientString(
              DEFAULT_LOGIN_BACKGROUND_GRADIENT_START,
              DEFAULT_LOGIN_BACKGROUND_GRADIENT_END
            ));
          }
          setLoginBackgroundColor(data[LOGIN_BACKGROUND_COLOR_KEY] || DEFAULT_LOGIN_BACKGROUND_COLOR);

          // Load evaluate header background settings
          setEvaluateHeaderBackgroundType((data[EVALUATE_HEADER_BACKGROUND_TYPE_KEY] as EvaluateHeaderBackgroundType) || DEFAULT_EVALUATE_HEADER_BACKGROUND_TYPE);
          setSavedEvaluateHeaderImageDataUrl(data[EVALUATE_HEADER_BACKGROUND_IMAGE_KEY] || null);
          setEvaluateHeaderImagePreviewUrl(data[EVALUATE_HEADER_BACKGROUND_IMAGE_KEY] || null);
          // Load full gradient string, or construct from legacy start/end if needed
          const fullGradient = data['evaluateHeaderBackgroundGradient'];
          if (fullGradient) {
            setEvaluateHeaderBackgroundGradient(fullGradient);
          } else if (data[EVALUATE_HEADER_BACKGROUND_GRADIENT_START_KEY] && data[EVALUATE_HEADER_BACKGROUND_GRADIENT_END_KEY]) {
            // Legacy: construct from start/end for backward compatibility
            setEvaluateHeaderBackgroundGradient(hslGradientToGradientString(
              data[EVALUATE_HEADER_BACKGROUND_GRADIENT_START_KEY],
              data[EVALUATE_HEADER_BACKGROUND_GRADIENT_END_KEY]
            ));
          } else {
            setEvaluateHeaderBackgroundGradient(hslGradientToGradientString(
              DEFAULT_EVALUATE_HEADER_BACKGROUND_GRADIENT_START,
              DEFAULT_EVALUATE_HEADER_BACKGROUND_GRADIENT_END
            ));
          }
          setEvaluateHeaderBackgroundColor(data[EVALUATE_HEADER_BACKGROUND_COLOR_KEY] || DEFAULT_EVALUATE_HEADER_BACKGROUND_COLOR);
          setEvaluateHeaderTextColor(data[EVALUATE_HEADER_TEXT_COLOR_KEY] || DEFAULT_EVALUATE_HEADER_TEXT_COLOR);

          // Load evaluate platform logo
          setSavedEvaluatePlatformLogoUrl(data[EVALUATE_PLATFORM_LOGO_DATA_URL_KEY] || null);
          setEvaluatePlatformLogoPreviewUrl(data[EVALUATE_PLATFORM_LOGO_DATA_URL_KEY] || null);

          // Load evaluate report logo
          setSavedEvaluateReportLogoUrl(data[EVALUATE_REPORT_LOGO_DATA_URL_KEY] || null);
          setEvaluateReportLogoPreviewUrl(data[EVALUATE_REPORT_LOGO_DATA_URL_KEY] || null);

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

          // Load generative AI canvas mode setting
          setGenerativeAICanvasMode(data[GENERATIVE_AI_CANVAS_MODE_KEY] === 'true' || data[GENERATIVE_AI_CANVAS_MODE_KEY] === true);

          // Load drawer style setting
          setDrawerStyle((data[DRAWER_STYLE_KEY] as DrawerStyle) || DEFAULT_DRAWER_STYLE);

          setThemeAndColors({
            themePreference: (data[APP_THEME_KEY] as ThemePreference) || DEFAULT_THEME,
            primaryGradient: data['primaryGradient'], // Simplified for brevity
            sidebarColors: newSidebarColors,
            primaryButtonShadows: {
              primaryButtonShadowL: data['primaryButtonShadowL'],
              primaryButtonShadowHoverL: data['primaryButtonShadowHoverL'],
              primaryButtonShadowD: data['primaryButtonShadowD'],
              primaryButtonShadowHoverD: data['primaryButtonShadowHoverD'],
            }
          });

        } catch (e: unknown) {
          if (!isMountedRef.current) return;
          const error = e as Error;
          if (error.name !== 'AbortError') {
            setErrorMsg(error.message || 'Failed to load preferences');
          }
        } finally {
          if (isMountedRef.current) {
            setLoading(false);
          }
        }
      }
      fetchPrefs();
    }

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      cleanupObjectUrls();
      cleanupSidebarBackground();
    };
  }, [sessionStatus, pathname, cleanupObjectUrls]);

  useEffect(() => {
    if (isMountedRef.current) {
      applySidebarStyles(sidebarColors);
    }
  }, [sidebarColors]);

  // Apply sidebar background settings when they change
  useEffect(() => {
    if (!isMountedRef.current) return;

    try {
      applySidebarBackgroundSettings({
        sidebarBackgroundType,
        sidebarBackgroundImageUrl: savedSidebarImageUrl || undefined,
        sidebarBackgroundImageFit: sidebarImageFit,
        sidebarBackgroundImagePosition: sidebarImagePosition,
      });

      // Dispatch event for immediate sidebar update
      window.dispatchEvent(new CustomEvent('appConfigChanged', {
        detail: {
          sidebarBackgroundType: sidebarBackgroundType,
          sidebarBackgroundImageUrl: savedSidebarImageUrl || null,
        }
      }));
    } catch (e) {
      console.warn('Failed to apply sidebar background settings', e);
    }
  }, [sidebarBackgroundType, savedSidebarImageUrl, sidebarImageFit, sidebarImagePosition]);

  // Sidebar Active Style Effect
  useEffect(() => {
    if (!isMountedRef.current) return;
    setSidebarActiveStyleTheme(sidebarActiveStyle);
  }, [sidebarActiveStyle]);

  async function handleSavePreferences() {
    setSaving(true);

    // Construct the settings object...
    // Note: In a full refactor, this logic would also be cleaned up or moved to a hook.
    // Preserving the existing 'FormData' logic which is likely how the original file worked.
    const formData = new FormData();
    formData.append(APP_THEME_KEY, themePreference);
    formData.append(APP_NAME_KEY, appName);
    formData.append(GENERATIVE_AI_CANVAS_MODE_KEY, String(generativeAICanvasMode));
    formData.append(DRAWER_STYLE_KEY, drawerStyle);

    // Sidebar colors
    SIDEBAR_COLOR_KEYS.forEach(key => {
      formData.append(key, sidebarColors[key]);
    });

    // Login Design
    formData.append(LOGIN_BACKGROUND_TYPE_KEY, loginBackgroundType);
    if (loginBackgroundGradient) formData.append('loginBackgroundGradient', loginBackgroundGradient);
    formData.append(LOGIN_BACKGROUND_COLOR_KEY, loginBackgroundColor);

    // Evaluate Header
    formData.append(EVALUATE_HEADER_BACKGROUND_TYPE_KEY, evaluateHeaderBackgroundType);
    if (evaluateHeaderBackgroundGradient) formData.append('evaluateHeaderBackgroundGradient', evaluateHeaderBackgroundGradient);
    formData.append(EVALUATE_HEADER_BACKGROUND_COLOR_KEY, evaluateHeaderBackgroundColor);
    formData.append(EVALUATE_HEADER_TEXT_COLOR_KEY, evaluateHeaderTextColor);

    // Sidebar settings
    formData.append(SIDEBAR_BACKGROUND_TYPE_KEY, sidebarBackgroundType);
    formData.append(SIDEBAR_BACKGROUND_IMAGE_FIT_KEY, sidebarImageFit);
    formData.append(SIDEBAR_BACKGROUND_IMAGE_POSITION_KEY, sidebarImagePosition);
    formData.append('sidebarActiveStylePreference', sidebarActiveStyle);

    // Files - Note: Logo is now uploaded immediately when selected, so we save the URL instead
    // Only append files that haven't been uploaded yet
    if (selectedLoginImageFile) formData.append('loginPageBackgroundImage', selectedLoginImageFile);
    if (selectedEvaluateHeaderImageFile) formData.append('evaluateHeaderBackgroundImage', selectedEvaluateHeaderImageFile);
    if (selectedSidebarImageFile) formData.append('sidebarBackgroundImage', selectedSidebarImageFile);
    
    // Save logo URL if it exists (uploaded via handleLogoFileChange)
    // ... Add other files if selected (contextual logos)
    const preferencesToSave: { key: string, value: string | null }[] = [];
    
    if (savedLogoUrl) preferencesToSave.push({ key: 'appLogoDataUrl', value: savedLogoUrl });
    if (savedLoginPageLogoLightModeUrl) preferencesToSave.push({ key: 'loginPageLogoLightMode', value: savedLoginPageLogoLightModeUrl });
    if (savedLoginPageLogoDarkModeUrl) preferencesToSave.push({ key: 'loginPageLogoDarkMode', value: savedLoginPageLogoDarkModeUrl });
    
    if (savedSidebarLogoCollapsedLightModeUrl) preferencesToSave.push({ key: 'sidebarLogoCollapsedLightMode', value: savedSidebarLogoCollapsedLightModeUrl });
    if (savedSidebarLogoExpandedLightModeUrl) preferencesToSave.push({ key: 'sidebarLogoExpandedLightMode', value: savedSidebarLogoExpandedLightModeUrl });
    
    if (savedSidebarLogoCollapsedDarkModeUrl) preferencesToSave.push({ key: 'sidebarLogoCollapsedDarkMode', value: savedSidebarLogoCollapsedDarkModeUrl });
    if (savedSidebarLogoExpandedDarkModeUrl) preferencesToSave.push({ key: 'sidebarLogoExpandedDarkMode', value: savedSidebarLogoExpandedDarkModeUrl });

    if (preferencesToSave.length > 0) {
      formData.append('preferences', JSON.stringify(preferencesToSave));
    }

    try {
      const res = await fetch('/api/settings/system-settings', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to save preferences');
      const data = await res.json();

      // Update saved states with response data
      if (data.appLogoDataUrl) setSavedLogoUrl(data.appLogoDataUrl);
      if (data[LOGIN_BACKGROUND_IMAGE_KEY]) setSavedLoginImageDataUrl(data[LOGIN_BACKGROUND_IMAGE_KEY]);

      success("Your system preferences have been updated successfully.");

      // Force refresh of theme/styles
      setThemeAndColors({
        themePreference,
        sidebarColors,
      });

    } catch (e) {
      const error = e as Error;
      showError(`Error Saving Preferences: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading || sessionStatus === 'loading' || (sessionStatus === 'unauthenticated' && pathname !== '/auth/signin' && !pathname.startsWith('/_next/')) || !isClient) {
    return (
      <div className="flex w-screen items-center justify-center bg-background fixed inset-0 z-50">
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
              Branding & Theme
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
            <div
              onClick={() => setActiveTab('evaluate')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'evaluate'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <Target className="h-4 w-4" />
              Evaluate
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === 'general' && (
              <GeneralTab
                canEdit={canEdit ?? false}
                appName={appName}
                setAppName={setAppName}
                themePreference={themePreference}
                setThemePreference={setThemePreference}
                generativeAICanvasMode={generativeAICanvasMode}
                setGenerativeAICanvasMode={setGenerativeAICanvasMode}
              />
            )}

            {activeTab === 'appearance' && (
              <AppearanceTab
                canEdit={canEdit ?? false}
                loginBackgroundType={loginBackgroundType}
                setLoginBackgroundType={setLoginBackgroundType}
                loginImagePreviewUrl={loginImagePreviewUrl}
                removeSelectedLoginImage={removeSelectedLoginImage}
                handleLoginImageFileChange={handleLoginImageFileChange}
                loginBackgroundGradient={loginBackgroundGradient}
                setLoginBackgroundGradient={setLoginBackgroundGradient}
                loginBackgroundColor={loginBackgroundColor}
                setLoginBackgroundColor={setLoginBackgroundColor}
                drawerStyle={drawerStyle}
                setDrawerStyle={setDrawerStyle}
              />
            )}

            {activeTab === 'branding' && (
              <BrandingTab
                canEdit={canEdit ?? false}
                handleLogoFileChange={handleLogoFileChange}
                logoPreviewUrl={logoPreviewUrl}
                removeSelectedLogo={removeSelectedLogo}

                handleLoginPageLogoLightModeChange={handleLoginPageLogoLightModeChange}
                loginPageLogoLightModePreviewUrl={loginPageLogoLightModePreviewUrl}
                setLoginPageLogoLightModePreviewUrl={setLoginPageLogoLightModePreviewUrl}
                setSavedLoginPageLogoLightModeUrl={setSavedLoginPageLogoLightModeUrl}

                handleLoginPageLogoDarkModeChange={handleLoginPageLogoDarkModeChange}
                loginPageLogoDarkModePreviewUrl={loginPageLogoDarkModePreviewUrl}
                setLoginPageLogoDarkModePreviewUrl={setLoginPageLogoDarkModePreviewUrl}
                setSavedLoginPageLogoDarkModeUrl={setSavedLoginPageLogoDarkModeUrl}

                handleSidebarLogoCollapsedLightModeChange={handleSidebarLogoCollapsedLightModeChange}
                sidebarLogoCollapsedLightModePreviewUrl={sidebarLogoCollapsedLightModePreviewUrl}
                setSidebarLogoCollapsedLightModePreviewUrl={setSidebarLogoCollapsedLightModePreviewUrl}
                setSavedSidebarLogoCollapsedLightModeUrl={setSavedSidebarLogoCollapsedLightModeUrl}

                handleSidebarLogoExpandedLightModeChange={handleSidebarLogoExpandedLightModeChange}
                sidebarLogoExpandedLightModePreviewUrl={sidebarLogoExpandedLightModePreviewUrl}
                setSidebarLogoExpandedLightModePreviewUrl={setSidebarLogoExpandedLightModePreviewUrl}
                setSavedSidebarLogoExpandedLightModeUrl={setSavedSidebarLogoExpandedLightModeUrl}

                handleSidebarLogoCollapsedDarkModeChange={handleSidebarLogoCollapsedDarkModeChange}
                sidebarLogoCollapsedDarkModePreviewUrl={sidebarLogoCollapsedDarkModePreviewUrl}
                setSidebarLogoCollapsedDarkModePreviewUrl={setSidebarLogoCollapsedDarkModePreviewUrl}
                setSavedSidebarLogoCollapsedDarkModeUrl={setSavedSidebarLogoCollapsedDarkModeUrl}

                handleSidebarLogoExpandedDarkModeChange={handleSidebarLogoExpandedDarkModeChange}
                sidebarLogoExpandedDarkModePreviewUrl={sidebarLogoExpandedDarkModePreviewUrl}
                setSidebarLogoExpandedDarkModePreviewUrl={setSidebarLogoExpandedDarkModePreviewUrl}
                setSavedSidebarLogoExpandedDarkModeUrl={setSavedSidebarLogoExpandedDarkModeUrl}
              />
            )}

            {activeTab === 'sidebar' && (
              <SidebarTab
                canEdit={canEdit ?? false}
                activeSidebarTab={activeSidebarTab}
                setActiveSidebarTab={setActiveSidebarTab}
                sidebarColors={sidebarColors}
                setSidebarColors={setSidebarColors}
                resetSidebarColors={resetSidebarColors}
                sidebarActiveStyle={sidebarActiveStyle}
                setSidebarActiveStyle={setSidebarActiveStyle}
                sidebarBackgroundType={sidebarBackgroundType}
                setSidebarBackgroundType={setSidebarBackgroundType}
                sidebarImagePreviewUrl={sidebarImagePreviewUrl}
                savedSidebarImageUrl={savedSidebarImageUrl}
                removeSelectedSidebarImage={removeSelectedSidebarImage}
                handleSidebarImageFileChange={handleSidebarImageFileChange}
                sidebarImageFit={sidebarImageFit}
                setSidebarImageFit={setSidebarImageFit}
                sidebarImagePosition={sidebarImagePosition}
                setSidebarImagePosition={setSidebarImagePosition}
              />
            )}

            {activeTab === 'evaluate' && (
              <EvaluateTab
                canEdit={canEdit ?? false}
                evaluateHeaderBackgroundType={evaluateHeaderBackgroundType}
                setEvaluateHeaderBackgroundType={setEvaluateHeaderBackgroundType}
                evaluateHeaderImagePreviewUrl={evaluateHeaderImagePreviewUrl}
                savedEvaluateHeaderImageDataUrl={savedEvaluateHeaderImageDataUrl}
                removeSelectedEvaluateHeaderImage={removeSelectedEvaluateHeaderImage}
                handleEvaluateHeaderImageFileChange={handleEvaluateHeaderImageFileChange}
                evaluateHeaderBackgroundGradient={evaluateHeaderBackgroundGradient}
                setEvaluateHeaderBackgroundGradient={setEvaluateHeaderBackgroundGradient}
                evaluateHeaderBackgroundColor={evaluateHeaderBackgroundColor}
                setEvaluateHeaderBackgroundColor={setEvaluateHeaderBackgroundColor}
                evaluateHeaderTextColor={evaluateHeaderTextColor}
                setEvaluateHeaderTextColor={setEvaluateHeaderTextColor}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}