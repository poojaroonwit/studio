// src/app/settings/layout.tsx
"use client";

import * as React from "react";
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // Added useRouter import
import { cn } from '@/lib/utils';
import {
  Settings,
  Palette,
  Zap,
  DatabaseZap,
  SlidersHorizontal,
  UsersRound,
  Users,
  Code2,
  ListOrdered,
  ShieldCheck,
  Loader2,
  Webhook,
  BrainCircuit,
  Tag,
  Database,
  AlertTriangle,

} from 'lucide-react';
import type { SettingsNavigationItem, PlatformModuleId } from '@/lib/types';
import { useSession, signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

const settingsNavItems: SettingsNavigationItem[] = [
  { href: "/settings/system-settings", label: "System Settings", icon: Database, description: "System-wide configuration and integrations.", permissionId: 'SYSTEM_SETTINGS_MANAGE' as PlatformModuleId, adminOnlyOrPermission: true },
  { href: "/settings/system-preferences", label: "Branding & Theme", icon: Palette, description: "Global branding, theme, and logo settings.", permissionId: 'SYSTEM_SETTINGS_MANAGE' as PlatformModuleId, adminOnlyOrPermission: true },
  { href: "/settings/system-prompts", label: "System Prompts & Categories", icon: BrainCircuit, description: "Manage AI system prompts and their categories.", permissionId: 'SYSTEM_SETTINGS_MANAGE' as PlatformModuleId, adminOnlyOrPermission: true },
  { href: "/settings/data-configuration", label: "Data Configuration", icon: Database, description: "Manage custom fields, recruitment stages, and candidate sources.", permissionId: 'SYSTEM_SETTINGS_MANAGE' as PlatformModuleId, adminOnlyOrPermission: true },

  { href: "/settings/webhooks", label: "Webhook Management", icon: Webhook, description: "Create and manage outgoing webhooks.", permissionId: 'WEBHOOK_MAPPING_MANAGE' as PlatformModuleId, adminOnlyOrPermission: true },

  { href: "/settings/users", label: "User Management", icon: UsersRound, description: "Manage users, roles, permissions, and teams.", permissionId: 'USERS_MANAGE' as PlatformModuleId, adminOnlyOrPermission: true },
  { href: "/settings/api-docs", label: "API Documentation", icon: Code2, description: "Developer API reference and documentation." },
  { href: "/settings/logs", label: "Application Logs", icon: ListOrdered, description: "View system and audit logs.", permissionId: 'LOGS_VIEW' as PlatformModuleId, adminOnlyOrPermission: true },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isClient, setIsClient] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const canAccess = React.useCallback((item: SettingsNavigationItem) => {
    if (!isClient || status !== 'authenticated' || !session?.user) return false;
    const userRole = session.user.role || 'Recruiter'; // Default fallback

    if (item.adminOnly && userRole !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE')) return false;
    if (item.adminOnlyOrPermission) { 
      if (userRole === 'Admin' || session.user.modulePermissions?.includes('USERS_MANAGE')) return true;
      if (item.permissionId && session.user.modulePermissions?.includes(item.permissionId)) return true;
      return false;
    }
    if (item.permissionId && userRole !== 'Admin' && !session.user.modulePermissions?.includes(item.permissionId)) return false;
    return true;
  }, [isClient, status, session?.user?.role, session?.user?.modulePermissions]);
  
  const visibleNavItems = React.useMemo(() => {
    // Ensure settingsNavItems is an array before calling filter
    const safeSettingsNavItems = Array.isArray(settingsNavItems) ? settingsNavItems : [];
    return safeSettingsNavItems.filter(item => canAccess(item));
  }, [canAccess]);

  if (status === "loading" && !isClient) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "unauthenticated" && isClient) {
    // Check if we're already on the signin page or if a logout is in progress
    const isOnSigninPage = typeof window !== 'undefined' && window.location.pathname === '/auth/signin';
    const isLogoutInProgress = typeof window !== 'undefined' && window.location.search.includes('signout=true');
    
    if (!isOnSigninPage && !isLogoutInProgress) {
      // Redirect to signin page instead of showing error message
      router.replace('/auth/signin');
    }
    
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }
  
  // Check if user has access to ANY settings page. If not, redirect.
  const canAccessAnySettings = visibleNavItems.length > 0;
  if (status === "authenticated" && isClient && !canAccessAnySettings && session?.user) {
      // If the user is on a settings page but shouldn't be, redirect them.
      if (pathname.startsWith("/settings")) {
          router.replace("/?message=NoSettingsAccess");
          return (<div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-2">Redirecting...</p></div>);
      }
  }

  // Check if we're on the main settings page (exactly /settings)
  const isMainSettingsPage = pathname === '/settings';

  return (
    <div className={cn("h-full overflow-hidden", isMainSettingsPage ? "" : "flex bg-muted/30")}>
      {!isMainSettingsPage && (
        <aside className="hidden md:flex md:flex-col md:w-80 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-muted/20 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/50">
          <nav className="py-4 px-2">
            <div className="space-y-1">
              {visibleNavItems.map((item, index) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <div key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center px-3 py-4 text-xs font-medium transition-all duration-200 hover:bg-muted/80 hover:text-primary relative h-20",
                        isActive
                          ? "bg-muted/60 text-primary font-semibold"
                          : "text-muted-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                                 <div className={cn(
                           "p-2 rounded-lg transition-colors shrink-0",
                           isActive 
                             ? "bg-muted/40 text-primary"
                             : "bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                         )}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="mb-1">
                            <span className="truncate font-medium">{item.label}</span>
                          </div>
                          <p className={cn(
                            "text-xs leading-relaxed break-words line-clamp-2",
                            isActive ? "text-primary/80" : "text-muted-foreground/80"
                          )}>
                            {item.description || ''}
                          </p>
                        </div>
                      </div>
                    </Link>
                    {index < visibleNavItems.length - 1 && (
                      <div className="border-b border-border/50 mx-3 my-1"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>
        </aside>
      )}
      <div className={cn("flex-1 flex flex-col overflow-hidden", isMainSettingsPage ? "h-full" : "")}>
        {/* Main content area - individual pages handle their own scrolling */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

