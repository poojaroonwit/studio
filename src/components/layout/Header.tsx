"use client";
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserAvatarCompact } from "@/components/ui/user-avatar";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { useIsMobile } from '@/hooks/use-mobile';
import { SunIcon as Sun, MoonIcon as Moon, ArrowRightOnRectangleIcon as LogOut, ArrowLeftOnRectangleIcon as LogIn, PencilSquareIcon as Edit3, KeyIcon as KeyRound, ExclamationTriangleIcon as AlertTriangle, TrashIcon as Trash2, ArrowPathIcon as RefreshCw, ComputerDesktopIcon as Monitor, ChevronDownIcon as ChevronDown, Bars3Icon as Menu, Cog6ToothIcon as Settings, CloudArrowUpIcon as UploadCloud, CubeIcon as Package2, ChevronLeftIcon as ChevronLeft, MagnifyingGlassIcon as Search } from '@heroicons/react/24/outline';

import { Breadcrumb } from '@/components/ui/breadcrumb';
import { usePathname } from 'next/navigation';
import { NotificationIcon } from '@/components/ui/notification-icon';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
import { UnifiedUserModal } from '@/components/users/UnifiedUserModal';
import { useTheme } from '@/hooks/use-theme';
import { ScrollArea } from '@/components/ui/scroll-area';

import type { UserProfile } from '@/lib/types';
import type { UnifiedUserFormValues } from '@/components/users/UnifiedUserModal';
import { toast } from 'react-hot-toast';
import { AutoFont } from '@/components/ui/auto-font';
import { DEFAULT_APP_NAME } from '@/lib/constants';
import { useAvatarRefresh } from '@/hooks/use-avatar-refresh';
import { UserPresenceIndicator } from '@/components/ui/user-presence-indicator';
import { APP_VERSION } from '@/lib/version';
import { convertMinIOUrlToSecureUrl } from '@/lib/imageUtils';

// Function to generate breadcrumb items based on pathname
function getBreadcrumbItems(pathname: string, showLogoOnly: boolean = false) {
  const items = [{ label: "Home", href: "/" }];

  if (pathname === "/") {
    // Always show Dashboard breadcrumb to allow realtime indicator to appear
    return [{ label: "Dashboard", href: "/" }];
  }

  if (pathname.startsWith("/applicants")) {
    // Always show Applicants breadcrumb to allow realtime indicator to appear
    items.push({ label: "Applicants", href: "/applicants" });

    if (pathname.split('/').length === 3 && pathname.split('/')[2] !== '' && !pathname.includes('create-via-automation')) {
      items.push({ label: "Applicant Details", href: pathname });
    }
  }

  if (pathname === "/process-queue") {
    items.push({ label: "Process Queue", href: "/process-queue" });
  }

  if (pathname.startsWith("/positions")) {
    // Always show Positions breadcrumb to allow realtime indicator to appear
    items.push({ label: "Job Positions", href: "/positions" });

    if (pathname.split('/').length === 3 && pathname.split('/')[2] !== '') {
      items.push({ label: "Position Details", href: pathname });
    }
  }



  if (pathname.startsWith("/my-tasks")) {
    items.push({ label: "My Task Board", href: "/my-tasks" });
  }

  if (pathname.startsWith("/settings")) {
    // Always show Settings breadcrumb to allow realtime indicator to appear
    items.push({ label: "Settings", href: "/settings" });

    if (pathname.startsWith("/settings/system-settings")) {
      items.push({ label: "System Settings", href: "/settings/system-settings" });
    } else if (pathname.startsWith("/settings/system-preferences")) {
      items.push({ label: "System Preferences", href: "/settings/system-preferences" });
    } else if (pathname.startsWith("/settings/stages")) {
      items.push({ label: "Recruitment Stages", href: "/settings/stages" });
    } else if (pathname.startsWith("/settings/custom-fields")) {
      items.push({ label: "Custom Fields", href: "/settings/custom-fields" });
    } else if (pathname.startsWith("/settings/user-groups")) {
      items.push({ label: "User Groups", href: "/settings/user-groups" });
    } else if (pathname.startsWith("/settings/users")) {
      items.push({ label: "User Management", href: "/settings/users" });
    } else if (pathname.startsWith("/settings/webhooks")) {
      items.push({ label: "Webhooks", href: "/settings/webhooks" });
    } else if (pathname.startsWith("/settings/logs")) {
      items.push({ label: "Application Logs", href: "/settings/logs" });
    } else if (pathname.startsWith("/settings/api-docs")) {
      items.push({ label: "API Documentation", href: "/settings/api-docs" });
    }
  }

  if (pathname.startsWith("/api-docs")) {
    items.push({ label: "API Documentation", href: "/api-docs" });
  }

  if (pathname.startsWith("/logs")) {
    items.push({ label: "Application Logs", href: "/logs" });
  }

  if (pathname.startsWith("/auth/signin")) {
    return [{ label: "Sign In", href: "/auth/signin" }];
  }

  return items;
}

interface HeaderProps {
  pageTitle: string;
  showLogoOnly?: boolean;
  appLogoUrl?: string | null;
  currentAppName?: string;
  contextualLogos?: any;
  isLogoLoading?: boolean;
}

export function Header({ pageTitle: initialPageTitle, showLogoOnly = false, appLogoUrl: propLogoUrl, currentAppName: propAppName, contextualLogos: propContextualLogos, isLogoLoading: propIsLogoLoading }: HeaderProps) {
  const isMobile = useIsMobile();

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const mountedRef = useRef(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [fullUserData, setFullUserData] = useState<UserProfile | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [currentAppName, setCurrentAppName] = useState<string>(propAppName || DEFAULT_APP_NAME);
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(propLogoUrl || null);
  const [effectivePageTitle, setEffectivePageTitle] = useState(initialPageTitle);
  const { refreshKey, forceRefresh } = useAvatarRefresh();

  // Screen size state
  const [currentScreenSize, setCurrentScreenSize] = useState(100);

  // Function to apply zoom using rem units
  const applyRemZoom = useCallback((zoomLevel: number) => {
    try {
      // Set the root font size to scale everything
      // Base font size is 16px, so we multiply by zoom level
      const baseFontSize = 16;
      const scaledFontSize = baseFontSize * zoomLevel;

      // Apply to document element
      document.documentElement.style.fontSize = `${scaledFontSize}px`;

      // Also set CSS custom property for additional scaling
      document.documentElement.style.setProperty('--zoom-scale', zoomLevel.toString());

      // Update body font size to ensure consistency
      document.body.style.fontSize = `${scaledFontSize}px`;

    } catch (error) {
      console.error('Error applying rem zoom:', error);
    }
  }, []);

  // Load saved zoom level on mount
  useEffect(() => {
    try {
      // On mobile, always use 100% screen size and don't allow changes
      if (isMobile) {
        setCurrentScreenSize(100);
        applyRemZoom(1.0);
        return;
      }

      // Check if there's a saved zoom level
      const savedZoom = localStorage.getItem('app-zoom-level');
      if (savedZoom) {
        const zoomLevel = parseFloat(savedZoom);
        const screenSize = Math.round(zoomLevel * 100);
        setCurrentScreenSize(screenSize);

        // Apply the saved zoom level using rem units
        applyRemZoom(zoomLevel);
      } else {
        // Default to 90% zoom (showing as 90% in app)
        setCurrentScreenSize(90);
        const defaultZoom = 0.9;
        applyRemZoom(defaultZoom);

        // Save the default zoom level
        localStorage.setItem('app-zoom-level', defaultZoom.toString());
      }
    } catch (error) {
      console.warn('Failed to load saved zoom level:', error);
    }
  }, [isMobile, applyRemZoom]);

  // Custom signout function that handles cleanup and redirect
  const handleSignOut = useCallback(async () => {
    try {
      // Immediately redirect to prevent any session validation from interfering
      // Set signout flag in URL first to stop validation
      const signoutUrl = '/auth/signin?signout=true';

      // Clear any cached data (don't wait for it)
      if (session?.user?.id) {
        // Removed user cache logging to reduce container logs
        // Clear user validation cache - fire and forget
        fetch('/api/auth/clear-user-cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session.user.id }),
        }).catch((error) => {
          console.warn('[HEADER] Cache clearing failed:', error);
        });
      }

      // Clear service worker caches and unregister to prevent cached authenticated pages
      if (typeof window !== 'undefined') {
        // Clear all SW caches
        if ('caches' in window) {
          try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          } catch (e) {
            console.warn('[HEADER] Failed to clear SW caches:', e);
          }
        }

        // Unregister all service workers to prevent stale cache serving
        if ('serviceWorker' in navigator) {
          try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(reg => reg.unregister()));
          } catch (e) {
            console.warn('[HEADER] Failed to unregister service workers:', e);
          }
        }

        // Clear localStorage and sessionStorage
        localStorage.clear();
        sessionStorage.clear();
      }

      // Wait for signout to complete to ensure session is cleared
      await signOut({
        callbackUrl: signoutUrl,
        redirect: false
      });

      // Redirect after signout
      window.location.href = signoutUrl;
    } catch (error) {
      console.error('[HEADER] Signout error:', error);
      // Fallback to window.location if signOut fails
      // Removed fallback logging to reduce container logs
      window.location.href = '/auth/signin?signout=true';
    }
  }, [session?.user?.id]);

  // Memoize user object to prevent unnecessary re-renders
  const user = useMemo(() => {
    if (!session?.user) return null;

    return {
      id: session.user.id as string,
      name: (session.user.name || session.user.email || 'User') as string,
      email: session.user.email ?? undefined,
      role: (session.user as any).role ?? 'Recruiter',
      avatarUrl: ((session.user as any).avatarUrl ?? null) as string | null,
      image: ((session.user as any).image ?? null) as string | null,
      personalColor: ((session.user as any).personalColor ?? null) as string | null,
    };
  }, [
    session?.user?.id,
    session?.user?.name,
    session?.user?.email,
    (session?.user as any)?.role,
    (session?.user as any)?.avatarUrl,
    (session?.user as any)?.image,
    (session?.user as any)?.personalColor,
  ]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      setMounted(true);
    }
  }, []);


  // Use the centralized theme hook instead of local state
  const { mounted: themeMounted, currentTheme, toggleTheme } = useTheme();



  useEffect(() => {
    const fetchAppName = async () => {
      try {
        const response = await fetch('/api/settings/system-settings');
        if (response.ok) {
          const data = await response.json();
          let settings: any = {};
          if (data.settings && Array.isArray(data.settings)) {
            settings = Object.fromEntries(data.settings.map((setting: any) => [setting.key, setting.value]));
          } else {
            settings = data;
          }
          const appName = settings.appName || DEFAULT_APP_NAME;
          const logoUrl = settings.appLogoDataUrl || null;

          setCurrentAppName(appName);
          setAppLogoUrl(logoUrl);
        }
      } catch (error) {
        console.warn('[HEADER] Failed to fetch app name:', error);
      }
    };

    fetchAppName();
  }, []);

  useEffect(() => {
    if (initialPageTitle === DEFAULT_APP_NAME && currentAppName !== DEFAULT_APP_NAME) {
      setEffectivePageTitle(currentAppName);
      document.title = currentAppName;
    } else {
      setEffectivePageTitle(initialPageTitle);
      document.title = initialPageTitle;
    }
  }, [initialPageTitle, currentAppName]);

  // Theme switch handler using the centralized theme hook
  const handleThemeSwitch = useCallback((checked: boolean) => {
    // Use the toggleTheme function from useTheme hook
    toggleTheme();
  }, [toggleTheme]);

  // Handle screen size change
  const handleScreenSizeChange = useCallback((size: number) => {
    // On mobile, prevent screen size changes
    if (isMobile) {
      toast.error('Screen size adjustment is not available on mobile');
      return;
    }

    setCurrentScreenSize(size);

    // Convert percentage to zoom level (75% = 0.75, 100% = 1.0, etc.)
    const zoomLevel = size / 100;

    // Apply zoom using rem units
    applyRemZoom(zoomLevel);

    // Store the zoom level for persistence
    localStorage.setItem('app-zoom-level', zoomLevel.toString());

    // Show success message
    toast.success(`Screen size set to ${size}%`);
  }, [applyRemZoom, isMobile]);

  const handleEditProfile = useCallback(async (data: UnifiedUserFormValues) => {
    if (!session?.user) return;

    try {
      const response = await fetch(`/api/users/${session.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to update profile');
      }

      const result = await response.json();
      toast.success("Profile Updated");

      // Check if session update is needed
      const needsSessionUpdate =
        session.user.name !== result.name ||
        session.user.email !== result.email ||
        session.user.avatarUrl !== result.avatarUrl ||
        session.user.personalColor !== result.personalColor;

      if (needsSessionUpdate) {
        await updateSession();

        // Force refresh the avatar after session update if it was updated
        if (session.user.avatarUrl !== result.avatarUrl) {
          forceRefresh();
        }
      }
      setIsUserModalOpen(false);
    } catch (error) {
      console.error('[HEADER] Profile update error:', error);
      toast.error((error as Error).message);
    }
  }, [session?.user, updateSession, forceRefresh]);

  const handleClearCache = () => {
    if (typeof window !== 'undefined') {
      // Clear localStorage
      localStorage.clear();

      // Clear sessionStorage
      sessionStorage.clear();

      // Clear IndexedDB
      if ('indexedDB' in window) {
        indexedDB.databases().then(databases => {
          databases.forEach(db => {
            if (db.name) {
              indexedDB.deleteDatabase(db.name);
            }
          });
        });
      }

      // Clear Service Worker caches
      if ('serviceWorker' in navigator) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            caches.delete(cacheName);
          });
        });
      }

      // Force refresh avatars
      forceRefresh();


      toast.success('Cache cleared successfully');
    }
  };

  // Listen for header branding changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBrandingChange = () => {
      // Force re-render if needed or just let the CSS variables handle it
      setMounted(prev => !prev);
      setTimeout(() => setMounted(true), 0);
    };

    window.addEventListener('headerBrandingChanged', handleBrandingChange);
    
    // Initialize header branding
    import('@/lib/theme/header-branding').then(m => m.initializeHeaderBranding());

    return () => {
      window.removeEventListener('headerBrandingChanged', handleBrandingChange);
    };
  }, []);

  const handleOpenProfileModal = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      // Fetch complete user data including userGroupId
      const response = await fetch(`/api/users/${session.user.id}`);
      if (response.ok) {
        const userData = await response.json();
        setFullUserData(userData);
        setIsUserModalOpen(true);
      } else {
        console.error('Failed to fetch user data for profile modal');
        // Fallback to using session data
        setIsUserModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching user data for profile modal:', error);
      // Fallback to using session data
      setIsUserModalOpen(true);
    }
  }, [session?.user?.id]);

  // Use a more robust mounting strategy to prevent double rendering in StrictMode
  // Only render the actual header once we're fully mounted and have session data
  const isLoading = !mounted || status === "loading";

  // Check if we should hide the header on mobile for detail pages
  const isDetailPage = useMemo(() => {
    if (!pathname) return false;
    const parts = pathname.split('/').filter(Boolean);

    // Check for Applicant/Applicant detail (e.g., /applicants/[id])
    const isApplicantDetail = (parts[0] === 'Applicants' || parts[0] === 'applicants') && parts.length >= 2;

    // Check for position detail (e.g., /positions/[id])
    const isPositionDetail = parts[0] === 'positions' && parts.length >= 2;

    return isApplicantDetail || isPositionDetail;
  }, [pathname]);

  // Hide header on mobile for detail pages
  if (isMobile && isDetailPage) {
    return null;
  }

  return (
    <>
      <header 
        className="h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-zinc-800/50 flex items-center justify-between px-4 lg:px-8 relative z-50 shrink-0 shadow-sm shadow-gray-200/20 dark:shadow-zinc-900/20 transition-all duration-300"
        style={{
          background: 'var(--header-background)',
          color: 'var(--header-foreground)'
        }}
      >
        <div className="flex items-center space-x-6">
          {/* Brand Logo */}
          <div className="flex items-center group">
            {appLogoUrl ? (
              <img
                src={convertMinIOUrlToSecureUrl(appLogoUrl, false) ?? ''}
                alt={currentAppName}
                className="w-9 h-9 rounded-xl flex-shrink-0 object-contain shadow-lg mr-4 group-hover:shadow-xl transition-all duration-300"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-blue-600/25 mr-4 group-hover:shadow-blue-600/40 transition-all duration-300">
                {currentAppName?.[0] || 'F'}
              </div>
            )}
            <div className="hidden md:block overflow-hidden whitespace-nowrap">
              {!showLogoOnly && (
                <>
                  <h1 className="font-bold tracking-tight text-xl leading-none mb-0.5" style={{ color: 'var(--header-foreground, inherit)' }}>{currentAppName}</h1>
                  <p className="text-[10px] font-medium uppercase tracking-widest leading-none opacity-70" style={{ color: 'var(--header-foreground, inherit)' }}>Platform</p>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          {isMobile && pathname?.includes('/evaluate') && (
            <Button variant="ghost" size="icon" className="lg:hidden -ml-2 rounded-none shadow-none" onClick={() => router.back()}>
              <ChevronLeft className="w-6 h-6" />
            </Button>
          )}

          {/* Vertical Divider */}
          <div className="hidden lg:block h-8 w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent dark:via-zinc-800 mx-6" />

          {/* Page Title */}
          <div className="hidden sm:block">
            {isLoading ? (
              <div className="h-5 w-32 rounded bg-muted animate-pulse" />
            ) : (
              <h2 className="text-sm font-semibold opacity-80" style={{ color: 'var(--header-foreground, inherit)' }}>{effectivePageTitle}</h2>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3 md:space-x-4">
          {isLoading ? (
            <>
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
            </>
          ) : (
            <>
              {/* User Presence Indicator */}
              {user && <div className="hidden md:block"><UserPresenceIndicator /></div>}

              {user ? (
                <div className="flex items-center space-x-2 md:space-x-3">
                  {/* Notification Bell */}
                  <NotificationIcon />

                  {/* User Profile Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-gray-100/50 dark:hover:bg-zinc-800/50 transition-all focus:outline-none group">
                        <div className="relative">
                          <UserAvatarCompact
                            user={user}
                            size="sm"
                            className="ring-2 ring-transparent group-hover:ring-blue-500/30 transition-all rounded-full"
                            forceRefresh={refreshKey > 0}
                          />
                        </div>
                        <div className="flex flex-col items-start mr-1 text-left">
                          <span className="text-[13px] font-bold leading-tight truncate max-w-[90px] sm:max-w-[120px]" style={{ color: 'var(--header-foreground, inherit)' }}>
                            {user.name}
                          </span>
                          <span className="text-[10px] font-medium uppercase tracking-tight opacity-60 truncate max-w-[90px] sm:max-w-[120px]" style={{ color: 'var(--header-foreground, inherit)' }}>
                            {user.role || 'User'}
                          </span>
                        </div>
                        <ChevronDown className="hidden sm:block w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: 'var(--header-foreground, inherit)' }} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-2xl border-gray-100 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl animate-in fade-in zoom-in duration-200">
                      <DropdownMenuLabel className="px-3 py-4">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name}</p>
                          <p className="text-[10px] text-gray-500 dark:text-zinc-500 font-medium uppercase tracking-tight truncate">{user.email || user.role}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-gray-100 dark:bg-zinc-800/60 my-1" />

                      <div className="p-1 space-y-0.5">
                        <DropdownMenuItem onClick={handleOpenProfileModal} className="flex items-center px-3 py-2.5 rounded-xl cursor-pointer text-[13px] font-medium text-gray-700 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          <Edit3 className="mr-3 h-4 w-4" />
                          <span>My Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsChangePasswordModalOpen(true)} className="flex items-center px-3 py-2.5 rounded-xl cursor-pointer text-[13px] font-medium text-gray-700 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          <KeyRound className="mr-3 h-4 w-4" />
                          <span>Security</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/settings')} className="flex items-center px-3 py-2.5 rounded-xl cursor-pointer text-[13px] font-medium text-gray-700 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          <Settings className="mr-3 h-4 w-4" />
                          <span>Settings</span>
                        </DropdownMenuItem>
                      </div>

                      <DropdownMenuSeparator className="bg-gray-100 dark:bg-zinc-800/60 my-1" />

                      <div className="p-1">
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="flex items-center px-3 py-2.5 rounded-xl cursor-pointer text-[13px] font-medium text-gray-700 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            {currentTheme === 'dark' ? <Moon className="mr-3 h-4 w-4" /> : <Sun className="mr-3 h-4 w-4" />}
                            <span>Appearance</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="p-1 min-w-[150px] rounded-xl border-gray-100 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl shadow-xl">
                            <DropdownMenuItem onClick={() => import('@/lib/themeUtils').then(m => m.setThemeAndColors({ themePreference: 'light' }))} className="flex items-center px-3 py-2 rounded-lg cursor-pointer text-[12px] font-medium">
                              <Sun className="mr-2 h-3.5 w-3.5" />
                              Light
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => import('@/lib/themeUtils').then(m => m.setThemeAndColors({ themePreference: 'dark' }))} className="flex items-center px-3 py-2 rounded-lg cursor-pointer text-[12px] font-medium">
                              <Moon className="mr-2 h-3.5 w-3.5" />
                              Dark
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => import('@/lib/themeUtils').then(m => m.setThemeAndColors({ themePreference: 'system' }))} className="flex items-center px-3 py-2 rounded-lg cursor-pointer text-[12px] font-medium">
                              <Monitor className="mr-2 h-3.5 w-3.5" />
                              System
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuItem onClick={handleClearCache} className="flex items-center px-3 py-2.5 rounded-xl cursor-pointer text-[13px] font-medium text-gray-700 dark:text-zinc-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                          <Trash2 className="mr-3 h-4 w-4" />
                          <span>Clear Cache</span>
                        </DropdownMenuItem>
                      </div>

                      <DropdownMenuSeparator className="bg-gray-100 dark:bg-zinc-800/60 my-1" />

                      <div className="p-1">
                        <DropdownMenuItem onClick={handleSignOut} className="flex items-center px-3 py-2.5 rounded-xl cursor-pointer text-[13px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                          <LogOut className="mr-3 h-4 w-4" />
                          <span>Sign Out</span>
                        </DropdownMenuItem>
                      </div>

                      <div className="px-3 pt-2 pb-1 text-center">
                        <p className="text-[9px] font-bold text-gray-300 dark:text-zinc-600 uppercase tracking-widest">Version {APP_VERSION}</p>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <Button variant="outline" onClick={() => signIn()}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
              )}
            </>
          )}
        </div>
      </header>
      {user && (
        <>
          <ChangePasswordModal
            isOpen={isChangePasswordModalOpen}
            onOpenChange={setIsChangePasswordModalOpen}
          />
          <UnifiedUserModal
            isOpen={isUserModalOpen}
            onOpenChange={setIsUserModalOpen}
            mode="profile"
            user={fullUserData || session?.user as UserProfile | null}
            onSave={handleEditProfile}
          />
          {/* Mobile Search Modal */}
          <Dialog open={isSearchModalOpen} onOpenChange={(open) => {
            setIsSearchModalOpen(open);
            if (!open) setSearchQuery('');
          }}>
            <DialogContent
              className="fixed bottom-0 left-1/2 top-auto translate-x-[-50%] translate-y-0 w-screen max-w-none h-[90vh] p-0 overflow-hidden rounded-t-3xl rounded-b-none border-0 shadow-2xl bg-background flex flex-col"
              dialogId="search-modal"
            >
              <VisuallyHidden>
                <DialogTitle>
                  {pathname === '/positions' ? 'Search Positions' : 'Search Applicants'}
                </DialogTitle>
              </VisuallyHidden>
              <DialogHeader className="border-b px-4 pt-6 pb-4 flex-shrink-0">
                <DialogTitle className="text-lg font-semibold text-center">
                  {pathname === '/positions' ? 'Search Positions' : 'Search Applicants'}
                </DialogTitle>
              </DialogHeader>
              <div className="p-4 flex flex-col gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={pathname === '/positions' ? 'Search by title, department...' : 'Search by name, email...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 text-base"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        setIsSearchModalOpen(false);
                        router.push(`${pathname}?q=${encodeURIComponent(searchQuery.trim())}`);
                        setSearchQuery('');
                      }
                    }}
                  />
                </div>
                <Button
                  className="w-full h-12"
                  disabled={!searchQuery.trim()}
                  onClick={() => {
                    if (searchQuery.trim()) {
                      setIsSearchModalOpen(false);
                      router.push(`${pathname}?q=${encodeURIComponent(searchQuery.trim())}`);
                      setSearchQuery('');
                    }
                  }}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

    </>
  );
}
