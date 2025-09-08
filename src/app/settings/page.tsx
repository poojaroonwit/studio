// src/app/settings/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { hasPermission, checkPermission } from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import './settings.css';

import { 
  Settings,
  Palette,
  DatabaseZap,
  Webhook,
  ShieldCheck,
  UsersRound,
  Users,
  Code2,
  ListOrdered,
  ArrowRight,
  BrainCircuit,
  Tag,
  Key,
  UserCheck,
  FileText,
  Zap,
  Database,
  Lock,
  Globe,
  BarChart3,
  AlertTriangle,

} from 'lucide-react';
import type { PlatformModuleId } from '@/lib/types';

// Error boundary component for settings page
class SettingsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Settings page error:', error, errorInfo);
    
    // Check for minified variable errors ('ee', 'tg', etc.)
    const isEeVariableError = error.message.includes('ee') && 
                              (error.message.includes('Cannot access') || 
                               error.message.includes('before initialization'));
    const isTgVariableError = error.message.includes('tg') && 
                              (error.message.includes('Cannot access') || 
                               error.message.includes('before initialization'));
    const isMinifiedVariableError = isEeVariableError || isTgVariableError;
    
    if (isMinifiedVariableError) {
      const variableName = isEeVariableError ? 'ee' : 'tg';
      console.error(`${variableName.toUpperCase()} Variable Error Context:`, {
        errorType: 'Temporal Dead Zone',
        likelyCause: 'Variable accessed before initialization in minified bundle',
        recommendation: 'Component initialization order issue',
        componentStack: errorInfo.componentStack
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="p-4 rounded-full bg-destructive/10 mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
            <p className="text-muted-foreground mb-4">
              There was an error loading the settings page. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Define all settings items in a flat array
const settingsItems = [
  { 
    href: "/settings/system-settings", 
    label: "System Settings", 
    icon: Database, 
    description: "System-wide configuration, integrations, automation, and upload queue processing settings.", 
    permissionId: 'SYSTEM_SETTINGS_VIEW' as PlatformModuleId, 
    adminOnlyOrPermission: true
  },
  { 
    href: "/settings/system-preferences", 
    label: "Branding & Theme", 
    icon: Palette, 
    description: "Global branding, theme, and logo settings.", 
    permissionId: 'SYSTEM_SETTINGS_VIEW' as PlatformModuleId, 
    adminOnlyOrPermission: true
  },
  { 
    href: "/settings/system-prompts", 
    label: "System Prompts & Categories", 
    icon: BrainCircuit, 
    description: "Manage AI system prompts and their categories.", 
    permissionId: 'SYSTEM_SETTINGS_VIEW' as PlatformModuleId, 
    adminOnlyOrPermission: true
  },
  { 
    href: "/settings/data-configuration", 
    label: "Data Configuration", 
    icon: Database, 
    description: "Manage custom fields, recruitment stages, and candidate sources.", 
    permissionId: 'RECRUITMENT_STAGES_VIEW' as PlatformModuleId, 
    adminOnlyOrPermission: true
  },
  { 
    href: "/settings/webhooks", 
    label: "Webhook Management", 
    icon: Webhook, 
    description: "Create and manage outgoing webhooks.", 
    permissionId: 'WEBHOOKS_EDIT' as PlatformModuleId, 
    adminOnlyOrPermission: true
  },
  { 
    href: "/settings/users", 
    label: "User Management", 
    icon: UsersRound, 
    description: "Manage users, roles, permissions, and teams.", 
    permissionId: 'USERS_VIEW' as PlatformModuleId, 
    adminOnlyOrPermission: true
  },
  { 
    href: "/settings/api-docs", 
    label: "API Documentation", 
    icon: Code2, 
    description: "Developer API reference and documentation." 
  },
  { 
    href: "/settings/logs", 
    label: "Application Logs", 
    icon: ListOrdered, 
    description: "View system and audit logs.", 
    permissionId: 'LOGS_VIEW' as PlatformModuleId, 
    adminOnlyOrPermission: true
  },
];

function SettingsPageContent() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [isClient, setIsClient] = useState(false);
  const [showLogoOnly, setShowLogoOnly] = useState<boolean>(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch showLogoOnly setting
  useEffect(() => {
    if (sessionStatus === 'authenticated' && isClient) {
      const fetchShowLogoOnly = async () => {
        try {
          const response = await fetch('/api/settings/system-settings');
          if (response.ok) {
            const data = await response.json();
            setShowLogoOnly(data.showLogoOnly === 'true' || data.showLogoOnly === true);
          }
        } catch (error) {
          console.error('Error fetching showLogoOnly setting:', error);
        }
      };
      fetchShowLogoOnly();
    }
  }, [sessionStatus, isClient]);

  const canAccess = (item: { adminOnly?: boolean, permissionId?: PlatformModuleId, adminOnlyOrPermission?: boolean }) => {
    // Defensive checks to prevent React error #185
    if (!isClient || sessionStatus !== 'authenticated') return false;
    
    // Ensure session and user exist
    if (!session?.user) return false;
    
    const userRole = session.user.role || 'Recruiter';
    const modulePermissions = Array.isArray(session.user.modulePermissions) 
      ? session.user.modulePermissions 
      : [];

    // Check for adminOnly items
    if (item.adminOnly) return false;

    // Check for adminOnlyOrPermission items
    if (item.adminOnlyOrPermission) {
      if (item.permissionId && checkPermission(userRole, modulePermissions, item.permissionId)) {
        return true;
      }
      return false;
    }

    // Check for specific permission items
    if (item.permissionId && !checkPermission(userRole, modulePermissions, item.permissionId)) {
      return false;
    }

    return true;
  };

  const accessibleItems = React.useMemo(() => {
    if (!isClient) return [];
    
    try {
      // Defensive check to prevent filter errors
      if (!Array.isArray(settingsItems)) {
        console.warn('Settings page: settingsItems is not an array:', settingsItems);
        return [];
      }
      
      return settingsItems.filter(item => {
        try {
          return canAccess(item);
        } catch (error) {
          console.warn('Settings page: Error filtering settings item:', error, item);
          return false;
        }
      });
    } catch (error) {
      console.error('Settings page: Error filtering settings items:', error);
      return [];
    }
  }, [isClient, sessionStatus, session?.user?.role, session?.user?.modulePermissions]);

  if (sessionStatus === 'loading' || !isClient) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col settings-page-grid">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            {!showLogoOnly && (
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            )}
            <p className="text-muted-foreground">
              Manage your application settings and configurations
            </p>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="flex-1 p-6 pt-0 overflow-y-auto">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {accessibleItems.map((item) => (
              <Card 
                key={item.href} 
                className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] bg-card/50 hover:bg-card h-48 flex flex-col"
                onClick={() => router.push(item.href)}
              >
                <CardHeader className="pb-3 flex-1">
                  <div className="flex items-start justify-between h-full">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 rounded-lg bg-muted/50 group-hover:bg-primary/10 transition-colors shrink-0">
                        <item.icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <CardTitle className="text-base font-medium mb-2">{item.label}</CardTitle>
                        <CardDescription className="text-sm leading-relaxed line-clamp-3 flex-1">
                          {item.description}
                        </CardDescription>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {accessibleItems.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Settings Available</h3>
              <p className="text-muted-foreground max-w-md">
                You don't have permission to access any settings. Contact your administrator for access.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <SettingsErrorBoundary>
      <SettingsPageContent />
    </SettingsErrorBoundary>
  );
}
