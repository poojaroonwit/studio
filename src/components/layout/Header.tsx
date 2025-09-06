"use client";
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserAvatarCompact } from "@/components/ui/user-avatar";
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sun, Moon, LogOut, LogIn, Edit3, KeyRound, AlertTriangle, Database, Trash2, RefreshCw, Bug, Monitor, ChevronDown } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { usePathname } from 'next/navigation';
import { NotificationIcon } from '@/components/ui/notification-icon';
import { WarningIcon } from '@/components/ui/warning-icon';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
import { RedesignedUserModal } from '@/components/users/RedesignedUserModal';
import { FloatingDebugOverlay } from '@/components/ui/floating-debug-overlay';
import { ZIndexDebugger, useZIndexDebugger } from '@/components/debug/ZIndexDebugger';

import type { UserProfile } from '@/lib/types';
import type { UserFormValues } from '@/components/users/RedesignedUserModal';
import { toast } from 'react-hot-toast';
import { AutoFont } from '@/components/ui/auto-font';
import { DEFAULT_APP_NAME } from '@/lib/constants';
import { useAvatarRefresh } from '@/hooks/use-avatar-refresh';
import { UserPresenceIndicator } from '@/components/ui/user-presence-indicator';

// Function to generate breadcrumb items based on pathname
function getBreadcrumbItems(pathname: string, showLogoOnly: boolean = false) {
  const items = [{ label: "Home", href: "/" }];
  
  if (pathname === "/") {
    // Always show Dashboard breadcrumb to allow realtime indicator to appear
    return [{ label: "Dashboard", href: "/" }];
  }
  
  if (pathname.startsWith("/candidates")) {
    // Always show Candidates breadcrumb to allow realtime indicator to appear
    items.push({ label: "Candidates", href: "/candidates" });
    
    if (pathname.split('/').length === 3 && pathname.split('/')[2] !== '' && !pathname.includes('create-via-automation')) {
      items.push({ label: "Candidate Details", href: pathname });
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
  
  if (pathname.startsWith("/users")) {
    items.push({ label: "Manage Users", href: "/users" });
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
      items.push({ label: "Users", href: "/settings/users" });
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
}

export function Header({ pageTitle: initialPageTitle, showLogoOnly = false }: HeaderProps) {
  const { isMobile, open } = useSidebar();
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const mountedRef = useRef(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [fullUserData, setFullUserData] = useState<UserProfile | null>(null);

  const [currentAppName, setCurrentAppName] = useState<string>(DEFAULT_APP_NAME);
  const [effectivePageTitle, setEffectivePageTitle] = useState(initialPageTitle);
  const { refreshKey, forceRefresh } = useAvatarRefresh();
  
  // Screen size state
  const [currentScreenSize, setCurrentScreenSize] = useState(100);

  // Load current browser zoom level on mount
  useEffect(() => {
    try {
      // Get current browser zoom level
      const currentZoom = window.outerWidth / window.innerWidth;
      
      // Map browser zoom to application zoom
      // Browser 90% = Application 100%
      // Browser 100% = Application 111%
      // Browser 75% = Application 83%
      // etc.
      const applicationZoom = Math.round((currentZoom / 0.9) * 100);
      setCurrentScreenSize(applicationZoom);
      
      // If browser is at default zoom (100%), set it to 90% and show as 100% in app
      if (Math.abs(currentZoom - 1.0) < 0.05) {
        // Browser is at 100%, we want it at 90%
        const event = new KeyboardEvent('keydown', {
          key: '-',
          code: 'Minus',
          keyCode: 189,
          which: 189,
          ctrlKey: true,
          metaKey: false,
          shiftKey: false,
          altKey: false,
          bubbles: true,
          cancelable: true
        });
        window.dispatchEvent(event);
        setCurrentScreenSize(100); // Show as 100% in app
      }
    } catch (error) {
      console.warn('Failed to get current browser zoom:', error);
    }
  }, []);

  // Custom signout function that handles cleanup and redirect
  const handleSignOut = async () => {
    // Removed session logging to reduce container logs
    
    try {
      // Clear any cached data
      if (session?.user?.id) {
        // Removed user cache logging to reduce container logs
        // Clear user validation cache
        await fetch('/api/auth/clear-user-cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session.user.id }),
        }).catch((error) => {
          console.warn('[HEADER] Cache clearing failed:', error);
        });
      }
      
      // Removed signout logging to reduce container logs
      // Use a more direct approach to prevent redirect loops
      const signOutResult = await signOut({ 
        callbackUrl: '/auth/signin?signout=true', 
        redirect: false 
      });
      
      // Removed signout result logging to reduce container logs
      
      // Manually redirect after signOut completes
      // Removed redirect logging to reduce container logs
      window.location.href = '/auth/signin?signout=true';
    } catch (error) {
      console.error('[HEADER] Signout error:', error);
      // Fallback to window.location if signOut fails
      // Removed fallback logging to reduce container logs
      window.location.href = '/auth/signin?signout=true';
    }
  };

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


  const [isDark, setIsDark] = useState(false);
  const [isDebugOverlayVisible, setIsDebugOverlayVisible] = useState(false);
  const { isVisible: isZIndexDebugVisible, setIsVisible: setIsZIndexDebugVisible } = useZIndexDebugger();

  // Initialize switch state from current theme / saved preference / system
  useEffect(() => {
    try {
      const root = document.documentElement;
      let initial = root.classList.contains('dark');
      const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
      
      if (saved === 'dark') initial = true;
      if (saved === 'light') initial = false;
      if (saved == null && !initial && typeof window !== 'undefined' && window.matchMedia) {
        initial = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      
      if (initial) root.classList.add('dark'); 
      else root.classList.remove('dark');
      
      setIsDark(initial);
    } catch (error) {
      console.warn('[HEADER] Theme initialization error:', error);
      setIsDark(false);
    }
  }, []);

  // Add keyboard shortcut listener for debug overlay
  useEffect(() => {
    const handleToggleDebug = () => {
      if (user?.role === 'Admin') {
        setIsDebugOverlayVisible(prev => !prev);
      }
    };

    window.addEventListener('toggleDebugOverlay', handleToggleDebug);
    return () => window.removeEventListener('toggleDebugOverlay', handleToggleDebug);
  }, [user?.role]);


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
          setCurrentAppName(appName);
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

  const handleThemeSwitch = useCallback((checked: boolean) => {
    try {
      setIsDark(checked);
      const root = document.documentElement;
      
      if (checked) root.classList.add('dark'); 
      else root.classList.remove('dark');
      
      try { 
        localStorage.setItem('theme', checked ? 'dark' : 'light'); 
      } catch (error) {
        console.warn('[HEADER] Failed to save theme preference:', error);
      }
      
      import('@/lib/themeUtils').then(({ reapplyCurrentSidebarColors }) => {
        reapplyCurrentSidebarColors();
      }).catch((error) => {
        console.warn('[HEADER] Failed to load theme utils:', error);
      });
    } catch (error) {
      console.error('[HEADER] Theme switch error:', error);
    }
  }, []);

  // Handle screen size change
  const handleScreenSizeChange = useCallback((size: number) => {
    setCurrentScreenSize(size);
    
    // Convert application zoom to browser zoom
    // Application 100% = Browser 90%
    // Application 110% = Browser 99%
    // Application 90% = Browser 81%
    // etc.
    const targetBrowserZoom = (size / 100) * 0.9;
    
    // Try to use browser's native zoom API
    try {
      // Method 1: Try Chrome extension API (if available)
      if (window.chrome && window.chrome.tabs && window.chrome.tabs.setZoom) {
        window.chrome.tabs.setZoom(targetBrowserZoom);
        toast.success(`Screen size set to ${size}%`);
        return;
      }
      
      // Method 2: Try Firefox zoom API (if available)
      if (window.fullZoom) {
        window.fullZoom = targetBrowserZoom;
        toast.success(`Screen size set to ${size}%`);
        return;
      }
      
      // Method 3: Try Safari zoom API (if available)
      if (window.zoom) {
        window.zoom(targetBrowserZoom);
        toast.success(`Screen size set to ${size}%`);
        return;
      }
      
      // Method 4: Try to use document.execCommand (deprecated but might work)
      if (document.execCommand) {
        const zoomLevel = Math.round(targetBrowserZoom * 100);
        document.execCommand('zoom', false, zoomLevel.toString());
        toast.success(`Screen size set to ${size}%`);
        return;
      }
      
      // Method 5: Try to use the browser's zoom property
      if (document.body.style.zoom !== undefined) {
        document.body.style.zoom = targetBrowserZoom.toString();
        document.documentElement.style.zoom = targetBrowserZoom.toString();
        toast.success(`Screen size set to ${size}%`);
        return;
      }
      
      // If none of the above work, show error message
      toast.error('Browser zoom cannot be controlled programmatically. Please use Ctrl+Plus/Minus manually.');
      
    } catch (error) {
      console.error('Error setting screen size:', error);
      toast.error('Browser zoom cannot be controlled programmatically. Please use Ctrl+Plus/Minus manually.');
    }
    
    // Store the target zoom level
    localStorage.setItem('app-zoom-level', targetBrowserZoom.toString());
  }, []);

  const handleEditProfile = useCallback(async (data: UserFormValues) => {
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
  if (!mounted || status === "loading") { 
    return (
      <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
          <div className="h-6 w-32 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
          <div className="h-10 w-10 rounded-md bg-muted animate-pulse" />
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6 sticky top-0 z-40">
        <div className={`flex items-center gap-2 ${!open ? 'ml-5' : ''}`}>
          <Breadcrumb items={getBreadcrumbItems(pathname, showLogoOnly)} />
        </div>
        <div className="flex items-center gap-3">
          
          {/* User Presence Indicator */}
          {user && <UserPresenceIndicator />}
          
          
          
          {/* Theme switch is shown inside avatar dropdown, not here */}
          {user && <WarningIcon />}
          {user && <NotificationIcon />}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="relative h-8 w-8 rounded-full cursor-pointer hover:bg-accent/20 transition-colors">
                  <UserAvatarCompact user={user} size="sm" forceRefresh={refreshKey > 0} />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-50">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <AutoFont className="text-sm font-medium leading-none">{user.name || "User"}</AutoFont>
                    {user.email && ( <p className="text-xs leading-none text-muted-foreground"> {user.email} </p> )}
                  </div>
                </DropdownMenuLabel>
                <div role="separator" aria-orientation="horizontal" className="-mx-1 my-1 h-px bg-muted"></div>
                <div className="px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Appearance</span>
                    <div className="flex items-center gap-2">
                      <Sun className="h-3.5 w-3.5 text-yellow-500" />
                      <Switch
                        checked={isDark}
                        onCheckedChange={handleThemeSwitch}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        aria-label="Toggle dark mode"
                      />
                      <Moon className="h-3.5 w-3.5 text-blue-400" />
                    </div>
                  </div>
                </div>
                
                {/* Screen Size Dropdown */}
                <div className="px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Screen Size</span>
                    <div className="flex items-center gap-2">
                      <Monitor className="h-3.5 w-3.5 text-green-500" />
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="text-xs px-2 py-1 h-6">
                          {currentScreenSize}%
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem onSelect={() => handleScreenSizeChange(75)}>
                            75%
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleScreenSizeChange(90)}>
                            90%
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleScreenSizeChange(100)}>
                            100%
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleScreenSizeChange(110)}>
                            110%
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleScreenSizeChange(125)}>
                            125%
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleScreenSizeChange(150)}>
                            150%
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    </div>
                  </div>
                </div>
                
                {/* Debug Toggle for Admin Users */}
                {user.role === 'Admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">Debug Overlay</span>
                        <div className="flex items-center gap-2">
                          <Bug className="h-3.5 w-3.5 text-purple-500" />
                          <Switch
                            checked={isDebugOverlayVisible}
                            onCheckedChange={setIsDebugOverlayVisible}
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            aria-label="Toggle debug overlay"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                <DropdownMenuSeparator />
                 <DropdownMenuItem onSelect={handleOpenProfileModal}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push(`/settings/users/${user.id}/warning-configurations`)}>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  My Warning Configurations
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={() => setIsChangePasswordModalOpen(true)}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Change Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
            
                <DropdownMenuItem onSelect={handleClearCache}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Cache
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" onClick={() => signIn()}>
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>
      </header>
      {user && (
        <>
          <ChangePasswordModal 
            isOpen={isChangePasswordModalOpen} 
            onOpenChange={setIsChangePasswordModalOpen} 
          />
          <RedesignedUserModal
            isOpen={isUserModalOpen}
            onOpenChange={setIsUserModalOpen}
            mode="profile"
            user={fullUserData || session?.user as UserProfile | null}
            onSave={handleEditProfile}
          />
        </>
      )}
      
      {/* Floating Debug Overlay */}
      <FloatingDebugOverlay 
        isVisible={isDebugOverlayVisible} 
        onClose={() => setIsDebugOverlayVisible(false)} 
      />
      
      {/* Z-Index Debugger */}
      <ZIndexDebugger isVisible={isZIndexDebugVisible} />
    </>
  );
}
