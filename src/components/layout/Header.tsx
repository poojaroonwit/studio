"use client";
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserAvatarCompact } from "@/components/ui/user-avatar";
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu';

import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerDescription, 
  DrawerFooter, 
  DrawerTrigger,
  DrawerClose
} from "@/components/ui/drawer";
import { SunIcon as Sun, MoonIcon as Moon, ArrowRightOnRectangleIcon as LogOut, ArrowLeftOnRectangleIcon as LogIn, PencilSquareIcon as Edit3, KeyIcon as KeyRound, ExclamationTriangleIcon as AlertTriangle, TrashIcon as Trash2, ArrowPathIcon as RefreshCw, ComputerDesktopIcon as Monitor, ChevronDownIcon as ChevronDown, Bars3Icon as Menu, Cog6ToothIcon as Settings, CloudArrowUpIcon as UploadCloud, CubeIcon as Package2, ChevronLeftIcon as ChevronLeft, FunnelIcon as Funnel, EyeIcon as Eye, MagnifyingGlassIcon as Search } from '@heroicons/react/24/outline';

import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { usePathname } from 'next/navigation';
import { NotificationIcon } from '@/components/ui/notification-icon';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
import { UnifiedUserModal } from '@/components/users/UnifiedUserModal';
import { useTheme } from '@/hooks/use-theme';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';

import type { UserProfile } from '@/lib/types';
import type { UnifiedUserFormValues } from '@/components/users/UnifiedUserModal';
import { toast } from 'react-hot-toast';
import { AutoFont } from '@/components/ui/auto-font';
import { DEFAULT_APP_NAME } from '@/lib/constants';
import { useAvatarRefresh } from '@/hooks/use-avatar-refresh';
import { UserPresenceIndicator } from '@/components/ui/user-presence-indicator';
import { APP_VERSION } from '@/lib/version';
import { convertMinIOUrlToSecureUrl } from '@/lib/imageUtils';
import { HeaderUniversalSearch } from '@/components/search/HeaderUniversalSearch';

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

  if (pathname.startsWith("/candidate")) {
    items.push({ label: "Candidate", href: "/candidate" });
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
  const [previewUsers, setPreviewUsers] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

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

  const handleUserSearch = async (query: string) => {
    if (query.length < 2) {
      setPreviewUsers([]);
      return;
    }
    setIsSearchingUsers(true);
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(query)}&isActive=true&limit=5`);
      const data = await res.json();
      setPreviewUsers(data.users || []);
    } catch (error) {
      console.error('[HEADER] User search error:', error);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleStartImpersonation = async (userId: string | null, role: string | null) => {
    try {
      toast.loading(userId ? 'Switching to user view...' : `Switching to ${role} view...`, { id: 'impersonate-toast' });
      await updateSession({ 
        impersonatedUserId: userId, 
        impersonatedRole: role 
      });
      toast.success('Preview mode active', { id: 'impersonate-toast' });
      // Small delay to ensure session state is fully settled before reload
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      toast.error('Failed to start preview mode', { id: 'impersonate-toast' });
    }
  };

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
  const isMyTasksHeader = pathname?.startsWith('/my-tasks');
  const supportsHeaderSearch = !pathname?.startsWith('/auth/');
  const supportsHeaderFilter = false;
  const headerSearchLabel = 'Search everything';

  const handleHeaderSearch = useCallback(() => {
    // Legacy support for focusing search, but use inline search now
    if (typeof window === 'undefined') return;
    if (isMyTasksHeader) {
      window.dispatchEvent(new Event('mytasks:focus-search'));
    }
  }, [isMyTasksHeader]);

  const handleHeaderFilter = useCallback(() => {
    if (typeof window === 'undefined' || !supportsHeaderFilter) {
      return;
    }

    window.dispatchEvent(new Event('mytasks:open-filters'));
  }, [supportsHeaderFilter]);

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

  useEffect(() => {
    if (typeof window === 'undefined' || !supportsHeaderSearch) return;

    // Handle keyboard shortcut to focus the inline search input
    const handleHeaderSearchShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        const searchInput = document.getElementById('header-search-input');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    window.addEventListener('keydown', handleHeaderSearchShortcut);
    return () => window.removeEventListener('keydown', handleHeaderSearchShortcut);
  }, [handleHeaderSearch, supportsHeaderSearch]);

  // Hide header on mobile for detail pages
  if (isMobile && isDetailPage) {
    return null;
  }

  return (
    <>
      <header 
        className={cn(
          "sticky z-50 h-16 shrink-0 border-b border-gray-200 dark:border-zinc-800 bg-white/70 dark:bg-black/40 backdrop-blur-xl px-4 lg:px-8 flex items-center justify-between transition-all duration-300",
          (session?.user?.impersonatedUserId || session?.user?.impersonatedRole) ? "top-8" : "top-0"
        )}
        style={{
          background: 'var(--header-background)',
          color: 'var(--header-foreground)'
        }}
      >
        <div className="flex min-w-0 items-center space-x-4 lg:space-x-6">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex min-w-0 items-center group text-left transition-transform duration-200 active:scale-95"
          >
            {appLogoUrl ? (
              <div className="relative mr-4 h-12 w-12 flex-shrink-0">
                <Image
                  src={convertMinIOUrlToSecureUrl(appLogoUrl, false) ?? ''}
                  alt={currentAppName}
                  fill
                  unoptimized
                  sizes="48px"
                  className="object-contain"
                />
                <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center font-bold text-white text-base shadow-[0_4px_12px_rgba(37,99,235,0.3)] mr-4 group-hover:shadow-[0_8px_20px_rgba(37,99,235,0.4)] group-hover:-translate-y-0.5 transition-all duration-300 overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700">
                {currentAppName?.[0] || 'F'}
              </div>
            )}
            <div className="hidden lg:flex items-center gap-3 overflow-hidden whitespace-nowrap">
              {!showLogoOnly && (
                <div className="flex flex-col justify-center overflow-hidden">
                  <h1 className="font-bold tracking-tight text-lg leading-tight truncate" style={{ color: 'var(--header-foreground, inherit)' }}>
                    {currentAppName}
                  </h1>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] leading-none mt-0.5 text-blue-600 dark:text-blue-400">
                    Platform
                  </p>
                </div>
              )}
            </div>
          </button>

          {/* Mobile Menu Button */}
          {isMobile && pathname?.includes('/evaluate') && (
            <Button variant="ghost" size="icon" className="lg:hidden rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800" onClick={() => router.back()}>
              <ChevronLeft className="w-6 h-6" />
            </Button>
          )}

          {/* Vertical Divider */}
          <div className="hidden lg:block h-8 w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent dark:via-zinc-800 mx-6" />
          {supportsHeaderSearch && (
            <div className="hidden md:flex items-center w-[300px] lg:w-[400px] ml-4">
              <HeaderUniversalSearch placeholder={headerSearchLabel} />
            </div>
          )}

          {/* Page Title */}
          <div className="hidden sm:block">
            {isLoading ? (
              <div className="h-5 w-32 rounded bg-muted animate-pulse" />
            ) : (
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200" style={{ color: 'var(--header-foreground, inherit)' }}>
                {effectivePageTitle}
              </h2>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3 md:space-x-5">
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
                  {/* Search Icon (Mobile Applicants/Candidates Page Only) */}
                  {isMobile && (
                    pathname === '/applicants' || 
                    pathname === '/Applicants' || 
                    pathname === '/candidates' || 
                    pathname === '/Candidates' ||
                    pathname === '/positions' ||
                    pathname === '/Positions'
                  ) && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn(
                        "rounded-full transition-all duration-200",
                        "text-gray-500 hover:text-primary hover:bg-primary/10",
                        "active:scale-90"
                      )}
                      onClick={() => {
                        const isApplicants = pathname.toLowerCase().startsWith('/applicants');
                        const isCandidates = pathname.toLowerCase().startsWith('/candidates');
                        const isPositions = pathname.toLowerCase().startsWith('/positions');
                        
                        let eventName = '';
                        if (isApplicants) eventName = 'applicants:toggle-mobile-search';
                        else if (isCandidates) eventName = 'candidates:toggle-mobile-search';
                        else if (isPositions) eventName = 'positions:toggle-mobile-search';
                        
                        if (eventName) {
                          window.dispatchEvent(new CustomEvent(eventName));
                        }
                      }}
                      aria-label="Search items"
                    >
                      <Search className="w-5 h-5" />
                    </Button>
                  )}

                  {/* Notification Bell */}
                  <NotificationIcon />

                  {/* User Profile Dropdown / Drawer */}
                  {isMobile ? (
                    <Drawer>
                      <DrawerTrigger asChild>
                        <button className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
                          <UserAvatarCompact
                            user={user}
                            size="sm"
                            className="rounded-full ring-1 ring-border/50"
                            forceRefresh={refreshKey > 0}
                          />
                          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200 shrink-0" />
                        </button>
                      </DrawerTrigger>
                      <DrawerContent className="max-h-[85vh]">
                        <div className="max-w-md mx-auto w-full overflow-y-auto px-4 pb-8 pt-4 custom-scrollbar">
                          <DrawerHeader className="px-1 text-left">
                            <div className="flex items-center gap-4 mb-2">
                              <UserAvatarCompact
                                user={user}
                                size="md"
                                className="rounded-2xl"
                                forceRefresh={refreshKey > 0}
                              />
                              <div className="flex flex-col">
                                <DrawerTitle className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                                  {user.name}
                                </DrawerTitle>
                                <DrawerDescription className="text-sm font-medium text-zinc-500 truncate max-w-[200px]">
                                  {user.email}
                                </DrawerDescription>
                                <Badge variant="secondary" className="mt-1 w-fit bg-primary/5 text-primary border-primary/10 text-[10px] uppercase font-bold tracking-wider">
                                  {user.role || 'User'}
                                </Badge>
                              </div>
                            </div>
                          </DrawerHeader>

                          <div className="space-y-6 mt-4">
                            {/* Profile Actions */}
                            <div className="grid grid-cols-2 gap-3">
                              <button 
                                onClick={() => { handleOpenProfileModal(); }}
                                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-100 transition-colors gap-2"
                              >
                                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                                  <Edit3 className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-bold">Profile</span>
                              </button>
                              <button 
                                onClick={() => { setIsChangePasswordModalOpen(true); }}
                                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-100 transition-colors gap-2"
                              >
                                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                                  <KeyRound className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-bold">Security</span>
                              </button>
                            </div>

                            {/* Core Navigation */}
                            <div className="space-y-1">
                              <button 
                                onClick={() => { router.push('/settings'); }}
                                className="flex items-center w-full px-4 py-3.5 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group gap-4"
                              >
                                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                  <Settings className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col text-left">
                                  <span className="text-sm font-bold">Settings</span>
                                  <span className="text-[11px] text-zinc-500">App preferences and system config</span>
                                </div>
                              </button>
                            </div>

                            {/* Admin Tools */}
                            {(user.role === 'Admin' || session?.user?.adminId) && (
                              <div className="space-y-3 p-1">
                                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 px-4">Admin Preview Tools</h4>
                                <div className="flex flex-col gap-2">
                                  <div className="grid grid-cols-2 gap-2 px-1">
                                    <button 
                                      onClick={() => handleStartImpersonation(null, 'Recruiter')}
                                      className="flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 text-amber-700 dark:text-amber-400 gap-1.5"
                                    >
                                      <Eye className="w-4 h-4" />
                                      <span className="text-[10px] font-black uppercase">Recruiter View</span>
                                    </button>
                                    <button 
                                      onClick={() => handleStartImpersonation(null, 'Hiring Manager')}
                                      className="flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 text-amber-700 dark:text-amber-400 gap-1.5"
                                    >
                                      <Package2 className="w-4 h-4" />
                                      <span className="text-[10px] font-black uppercase">Manager View</span>
                                    </button>
                                  </div>

                                  <div className="px-1 mt-1">
                                    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                                      <div className="p-3 border-b border-zinc-100 dark:border-zinc-800">
                                        <div className="relative">
                                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                          <input 
                                            type="text" 
                                            placeholder="Search users to preview..." 
                                            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                                            onChange={(e) => handleUserSearch(e.target.value)}
                                          />
                                        </div>
                                      </div>
                                      <ScrollArea className="max-h-[200px]">
                                        <div className="p-1">
                                          {isSearchingUsers ? (
                                            <div className="py-8 text-center">
                                              <RefreshCw className="h-5 w-5 animate-spin mx-auto text-amber-500/50" />
                                            </div>
                                          ) : previewUsers.length > 0 ? (
                                            <div className="space-y-0.5">
                                              {previewUsers.map((u) => (
                                                <button 
                                                  key={u.id} 
                                                  onClick={() => handleStartImpersonation(u.id, null)} 
                                                  className="flex items-center w-full px-3 py-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors gap-3 group text-left"
                                                >
                                                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 dark:text-amber-400 text-xs font-bold">
                                                    {u.name.charAt(0)}
                                                  </div>
                                                  <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-bold truncate group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">{u.name}</span>
                                                    <span className="text-[10px] text-zinc-500 truncate">{u.role}</span>
                                                  </div>
                                                </button>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="py-8 text-center px-4">
                                              <p className="text-[11px] text-zinc-400 font-medium">
                                                Enter search term to find users to preview as
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </ScrollArea>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Appearance */}
                            <div className="space-y-3 p-1">
                              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 px-4">Appearance</h4>
                              <div className="flex items-center gap-2 px-1">
                                {[
                                  { id: 'light', label: 'Light', icon: Sun },
                                  { id: 'dark', label: 'Dark', icon: Moon },
                                  { id: 'system', label: 'System', icon: Monitor },
                                ].map((t) => (
                                  <button
                                    key={t.id}
                                    onClick={() => import('@/lib/themeUtils').then(m => m.setThemeAndColors({ themePreference: t.id as any }))}
                                    className={cn(
                                      "flex-1 flex flex-col items-center py-3 rounded-2xl border transition-all gap-1.5",
                                      currentTheme === t.id 
                                        ? "bg-white dark:bg-zinc-800 border-primary text-primary shadow-sm"
                                        : "bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-500"
                                    )}
                                  >
                                    <t.icon className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">{t.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            {/* System Actions */}
                            <div className="space-y-1">
                              <button 
                                onClick={handleClearCache}
                                className="flex items-center w-full px-4 py-3.5 rounded-2xl hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all group gap-4 text-amber-600 dark:text-amber-400"
                              >
                                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                                  <Trash2 className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col text-left">
                                  <span className="text-sm font-bold">Clear Cache</span>
                                  <span className="text-[11px] opacity-70">Refresh local data and assets</span>
                                </div>
                              </button>
                              
                              <button 
                                onClick={handleSignOut}
                                className="flex items-center w-full px-4 py-3.5 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-all group gap-4 text-red-600 dark:text-red-400"
                              >
                                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                                  <LogOut className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col text-left">
                                  <span className="text-sm font-bold tracking-tight">Sign Out</span>
                                  <span className="text-[11px] opacity-70">End your current session</span>
                                </div>
                              </button>
                            </div>

                            <div className="text-center pt-2">
                               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300 dark:text-zinc-600">
                                 Version {APP_VERSION}
                               </span>
                            </div>
                          </div>
                        </div>
                      </DrawerContent>
                    </Drawer>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center space-x-3 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all duration-200 group focus:outline-none">
                          <div className="relative">
                            <UserAvatarCompact
                              user={user}
                              size="sm"
                              className="rounded-full"
                              forceRefresh={refreshKey > 0}
                            />
                          </div>
                          <div className="hidden sm:block text-left pr-3">
                            <span className="block text-sm font-semibold leading-none truncate max-w-[120px]" style={{ color: 'var(--header-foreground, inherit)' }}>
                              {user.name}
                            </span>
                            <span className="block text-[10px] font-medium uppercase mt-0.5 tracking-wider opacity-60 truncate max-w-[120px]" style={{ color: 'var(--header-foreground, inherit)' }}>
                              {user.role || 'User'}
                            </span>
                          </div>
                          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200 shrink-0" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-72 p-0 rounded-2xl shadow-2xl border border-border/50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl animate-in fade-in zoom-in duration-200">
                        <DropdownMenuLabel className="px-5 py-4">
                          <div className="flex flex-col space-y-1">
                            <p className="text-xs font-medium text-gray-500 dark:text-zinc-500 uppercase tracking-widest">Signed in as</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate mt-1">{user.email || user.name}</p>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-gray-100 dark:bg-zinc-800/60" />

                        <div className="p-3 space-y-1">
                          <DropdownMenuItem onClick={handleOpenProfileModal} className="flex items-center px-4 py-3 rounded-xl cursor-pointer text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50/80 dark:hover:bg-zinc-800/80 transition-colors">
                            <Edit3 className="mr-3 h-4 w-4" />
                            <span>My Profile</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setIsChangePasswordModalOpen(true)} className="flex items-center px-4 py-3 rounded-xl cursor-pointer text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50/80 dark:hover:bg-zinc-800/80 transition-colors">
                            <KeyRound className="mr-3 h-4 w-4" />
                            <span>Security</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push('/settings')} className="flex items-center px-4 py-3 rounded-xl cursor-pointer text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50/80 dark:hover:bg-zinc-800/80 transition-colors">
                            <Settings className="mr-3 h-4 w-4" />
                            <span>Settings</span>
                          </DropdownMenuItem>
                        </div>

                        {/* Preview Mode / Impersonation Tools - Admin Only */}
                        {(user.role === 'Admin' || session?.user?.adminId) && (
                          <>
                            <DropdownMenuSeparator className="bg-gray-100 dark:bg-zinc-800/60" />
                            <div className="p-3 space-y-1">
                              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest px-3 mb-2">Preview Tools</p>
                              
                              {/* Role Preview */}
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="flex items-center px-4 py-3 rounded-xl cursor-pointer text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-amber-50/50 dark:hover:bg-amber-500/5 transition-colors">
                                  <Eye className="mr-3 h-4 w-4 text-amber-500" />
                                  <span>Preview as Role</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="p-1 min-w-[180px] rounded-xl border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl">
                                  <DropdownMenuItem onClick={() => handleStartImpersonation(null, 'Recruiter')} className="px-3 py-2 rounded-lg cursor-pointer text-xs font-medium">
                                    Recruiter View
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStartImpersonation(null, 'Hiring Manager')} className="px-3 py-2 rounded-lg cursor-pointer text-xs font-medium">
                                    Hiring Manager View
                                  </DropdownMenuItem>
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>

                              {/* User Preview */}
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="flex items-center px-4 py-3 rounded-xl cursor-pointer text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-amber-50/50 dark:hover:bg-amber-500/5 transition-colors">
                                  <Package2 className="mr-3 h-4 w-4 text-amber-500" />
                                  <span>Preview as User</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="p-0 min-w-[240px] max-h-[300px] overflow-hidden rounded-xl border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl flex flex-col">
                                  <div className="p-2 border-b border-border/50">
                                    <input 
                                      type="text" 
                                      placeholder="Search users..." 
                                      className="w-full px-3 py-1.5 text-xs rounded-md bg-muted/50 border-none focus:ring-1 focus:ring-amber-500 outline-none"
                                      autoFocus
                                      onChange={(e) => handleUserSearch(e.target.value)}
                                    />
                                  </div>
                                  <ScrollArea className="flex-1 max-h-[220px]">
                                    <div className="p-1">
                                      {isSearchingUsers ? (
                                        <div className="py-8 text-center">
                                          <RefreshCw className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                                        </div>
                                      ) : previewUsers.length > 0 ? (
                                        previewUsers.map((u) => (
                                          <DropdownMenuItem 
                                            key={u.id} 
                                            onClick={() => handleStartImpersonation(u.id, null)} 
                                            className="flex flex-col items-start px-3 py-2 rounded-lg cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                                          >
                                            <span className="text-xs font-semibold">{u.name}</span>
                                            <span className="text-[10px] text-muted-foreground">{u.email} • {u.role}</span>
                                          </DropdownMenuItem>
                                        ))
                                      ) : (
                                        <p className="p-4 text-[10px] text-muted-foreground italic text-center">
                                          Type at least 2 characters to search active users
                                        </p>
                                      )}
                                    </div>
                                  </ScrollArea>
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                            </div>
                          </>
                        )}

                        <DropdownMenuSeparator className="bg-gray-100 dark:bg-zinc-800/60" />

                        <div className="p-4">
                          <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest px-3 mb-3">Appearance</p>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="flex items-center px-4 py-3 rounded-xl cursor-pointer text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50/80 dark:hover:bg-zinc-800/80 transition-colors">
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
                          <DropdownMenuItem onClick={handleClearCache} className="mt-2 flex items-center px-4 py-3 rounded-xl cursor-pointer text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                            <Trash2 className="mr-3 h-4 w-4" />
                            <span>Clear Cache</span>
                          </DropdownMenuItem>
                        </div>

                        <DropdownMenuSeparator className="bg-gray-100 dark:bg-zinc-800/60" />

                        <div className="p-3">
                          <DropdownMenuItem onClick={handleSignOut} className="flex items-center px-4 py-3 rounded-xl cursor-pointer text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-900/20 transition-colors">
                            <LogOut className="mr-3 h-4 w-4" />
                            <span>Sign Out</span>
                          </DropdownMenuItem>
                        </div>

                        <div className="px-3 pt-1 pb-3 text-center">
                          <p className="text-[9px] font-bold text-gray-300 dark:text-zinc-600 uppercase tracking-widest">Version {APP_VERSION}</p>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
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

        </>
      )}

    </>
  );
}
