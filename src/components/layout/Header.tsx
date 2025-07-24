"use client";
import { useSidebar } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, LogOut, UserCircle, LogIn, KeyRound, Edit3, Home, Users, Briefcase, Settings, ListTodo, UploadCloud, UsersRound, Code2, ListOrdered, Palette, Zap, DatabaseZap, SlidersHorizontal, KanbanSquare, Settings2, UserCog, FileText, Webhook } from "lucide-react"; 
import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
import { EditUserModal, type EditUserFormValues } from '@/components/users/EditUserModal';
import { toast } from "react-hot-toast";
import type { UserProfile } from "@/lib/types";
import * as React from 'react';
import { usePathname } from "next/navigation";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { AutoFont } from "@/components/ui/auto-font";


const APP_CONFIG_APP_NAME_KEY = 'appConfigAppName';
const DEFAULT_APP_NAME = "CV-Screening";

// Function to generate breadcrumb items based on pathname
function getBreadcrumbItems(pathname: string) {
  const items: BreadcrumbItem[] = [{ label: "Home", href: "/", icon: Home }];
  
  if (pathname === "/") {
    return [{ label: "Dashboard", href: "/", icon: Home }];
  }
  
  if (pathname.startsWith("/candidates")) {
    items.push({ label: "Candidates", href: "/candidates", icon: Users });
    
    if (pathname === "/candidates/upload") {
      items.push({ label: "Bulk Upload", href: "/candidates/upload", icon: UploadCloud });
    } else if (pathname.split('/').length === 3 && pathname.split('/')[2] !== '' && !pathname.includes('create-via-automation')) {
      items.push({ label: "Candidate Details", href: pathname, icon: UserCircle });
    }
  }
  
  if (pathname.startsWith("/positions")) {
    items.push({ label: "Positions", href: "/positions", icon: Briefcase });
    
    if (pathname.split('/').length === 3 && pathname.split('/')[2] !== '') {
      items.push({ label: "Position Details", href: pathname, icon: Briefcase });
    }
  }
  
  if (pathname.startsWith("/users")) {
    items.push({ label: "Manage Users", href: "/users", icon: UsersRound });
  }
  
  if (pathname.startsWith("/my-tasks")) {
    items.push({ label: "My Task Board", href: "/my-tasks", icon: ListTodo });
  }
  
  if (pathname.startsWith("/settings")) {
    items.push({ label: "Settings", href: "/settings", icon: Settings });
    
    if (pathname.startsWith("/settings/system-settings")) {
      items.push({ label: "System Settings", href: "/settings/system-settings", icon: Settings });
    } else if (pathname.startsWith("/settings/system-preferences")) {
      items.push({ label: "System Preferences", href: "/settings/system-preferences", icon: Palette });
    } else if (pathname.startsWith("/settings/stages")) {
      items.push({ label: "Recruitment Stages", href: "/settings/stages", icon: KanbanSquare });
    } else if (pathname.startsWith("/settings/data-models")) {
      items.push({ label: "Data Model UI", href: "/settings/data-models", icon: DatabaseZap });
    } else if (pathname.startsWith("/settings/custom-fields")) {
      items.push({ label: "Custom Fields", href: "/settings/custom-fields", icon: Settings2 });
    } else if (pathname.startsWith("/settings/user-groups")) {
      items.push({ label: "User Groups", href: "/settings/user-groups", icon: UsersRound });
    } else if (pathname.startsWith("/settings/users")) {
      items.push({ label: "Users", href: "/settings/users", icon: UsersRound });
    } else if (pathname.startsWith("/settings/webhooks")) {
      items.push({ label: "Webhooks", href: "/settings/webhooks", icon: Webhook });
    } else if (pathname.startsWith("/settings/logs")) {
      items.push({ label: "Application Logs", href: "/settings/logs", icon: ListOrdered });
    } else if (pathname.startsWith("/settings/api-docs")) {
      items.push({ label: "API Documentation", href: "/settings/api-docs", icon: Code2 });
    }
  }
  
  if (pathname.startsWith("/api-docs")) {
    items.push({ label: "API Documentation", href: "/api-docs", icon: Code2 });
  }
  
  if (pathname.startsWith("/logs")) {
    items.push({ label: "Application Logs", href: "/logs", icon: ListOrdered });
  }
  
  if (pathname.startsWith("/auth/signin")) {
    return [{ label: "Sign In", href: "/auth/signin", icon: LogIn }];
  }
  
  return items;
}

export function Header({ pageTitle: initialPageTitle }: { pageTitle: string }) {
  const { isMobile, open } = useSidebar();
  const { data: session, status, update: updateSession } = useSession();
  const [mounted, setMounted] = useState(false);
  const [currentAppName, setCurrentAppName] = useState<string>(DEFAULT_APP_NAME);
  const [effectivePageTitle, setEffectivePageTitle] = useState(initialPageTitle);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedAppName = localStorage.getItem(APP_CONFIG_APP_NAME_KEY);
      setCurrentAppName(storedAppName || DEFAULT_APP_NAME);
      // Listen for appConfigChanged event
      const handleAppConfigChange = (event: Event) => {
        const customEvent = event as CustomEvent<{ appName?: string }>;
        if (customEvent.detail && customEvent.detail.appName) {
          setCurrentAppName(customEvent.detail.appName);
          document.title = customEvent.detail.appName;
        } else {
          const storedAppName = localStorage.getItem(APP_CONFIG_APP_NAME_KEY);
          setCurrentAppName(storedAppName || DEFAULT_APP_NAME);
          document.title = storedAppName || DEFAULT_APP_NAME;
        }
      };
      window.addEventListener('appConfigChanged', handleAppConfigChange);
      return () => {
        window.removeEventListener('appConfigChanged', handleAppConfigChange);
      };
    }
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

  const toggleTheme = () => {
    const root = document.documentElement;
    const willBeDark = !root.classList.contains('dark');
    root.classList.toggle('dark');
    
    // Re-apply sidebar colors with explicit theme information
    requestAnimationFrame(() => {
      import('@/lib/themeUtils').then(({ reapplyCurrentSidebarColors }) => {
        reapplyCurrentSidebarColors();
      });
    });
  };

  const handleEditProfile = async (userId: string, data: EditUserFormValues) => {
    if (!session?.user) return;
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to update profile');
      }
      toast.success("Profile Updated");
      
      // Trigger session update if name or email changed
      if (session.user.name !== result.name || session.user.email !== result.email) {
        await updateSession({
          name: result.name,
          email: result.email,
        });
      }
      setIsEditProfileModalOpen(false);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };


  if (!mounted || status === "loading") { 
    return (
      <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6 sticky top-0 z-30">
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

  const user = session?.user;

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6 sticky top-0 z-30">
        <div className={`flex items-center gap-2 ${!open ? 'ml-5' : ''}`}>
          <Breadcrumb items={getBreadcrumbItems(pathname)} />
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-lg">
                  <Avatar size="md" className="border border-border">
                    <AvatarImage src={user.image || undefined} alt={user.name || "User"} data-ai-hint={user.image ? undefined : "profile person"} />
                    <AvatarFallback className="text-sm font-medium">{user.name?.charAt(0)?.toUpperCase() || <UserCircle className="h-4 w-4"/>}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <AutoFont className="text-sm font-medium leading-none">{user.name || "User"}</AutoFont>
                    {user.email && ( <p className="text-xs leading-none text-muted-foreground"> {user.email} </p> )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                 <DropdownMenuItem onSelect={() => setIsEditProfileModalOpen(true)}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setIsChangePasswordModalOpen(true)}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Change Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => signOut({ callbackUrl: '/auth/signin' })}>
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
          <EditUserModal
            isOpen={isEditProfileModalOpen}
            onOpenChange={setIsEditProfileModalOpen}
            onEditUser={handleEditProfile}
            user={session?.user as UserProfile | null} 
            isSelfEdit={true} 
          />
        </>
      )}
    </>
  );
}
