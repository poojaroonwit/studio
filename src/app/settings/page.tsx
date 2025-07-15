// src/app/settings/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Settings,
  Palette,
  KanbanSquare,
  DatabaseZap,
  Settings2 as CustomFieldsIcon,
  Webhook,
  ShieldCheck,
  UsersRound,
  Code2,
  ListOrdered,
  ArrowRight
} from 'lucide-react';
import type { PlatformModuleId } from '@/lib/types';

const settingsItems = [
  { href: "/settings/system-settings", label: "System Settings", icon: Settings, description: "System-wide configuration.", permissionId: 'SYSTEM_SETTINGS_MANAGE' as PlatformModuleId, adminOnlyOrPermission: true },
  { href: "/settings/system-preferences", label: "Preferences", icon: Palette, description: "Global branding, theme, and logo settings.", permissionId: 'SYSTEM_SETTINGS_MANAGE' as PlatformModuleId, adminOnlyOrPermission: true },
  { href: "/settings/stages", label: "Recruitment Stages", icon: KanbanSquare, description: "Define your hiring pipeline.", permissionId: 'RECRUITMENT_STAGES_MANAGE' as PlatformModuleId, adminOnlyOrPermission: true },
  { href: "/settings/data-models", label: "Data Model UI", icon: DatabaseZap, description: "Customize UI for data attributes.", permissionId: 'USER_PREFERENCES_MANAGE' as PlatformModuleId, adminOnlyOrPermission: true },
  { href: "/settings/custom-fields", label: "Custom Fields", icon: CustomFieldsIcon, description: "Define custom fields for entities.", permissionId: 'CUSTOM_FIELDS_MANAGE' as PlatformModuleId, adminOnlyOrPermission: true },
  { href: "/settings/webhooks", label: "Webhook Management", icon: Webhook, description: "Create and manage outgoing webhooks.", permissionId: 'WEBHOOK_MAPPING_MANAGE' as PlatformModuleId, adminOnlyOrPermission: true },
  { href: "/settings/user-groups", label: "Roles & Permissions", icon: ShieldCheck, description: "Manage user roles and permissions.", permissionId: 'USER_GROUPS_MANAGE' as PlatformModuleId, adminOnlyOrPermission: true },
  { href: "/settings/users", label: "Manage Users", icon: UsersRound, description: "Add, edit, or remove users.", permissionId: 'USERS_MANAGE' as PlatformModuleId, adminOnlyOrPermission: true },
  { href: "/settings/api-key", label: "API Key Management", icon: Code2, description: "Generate and manage your personal API key.", permissionId: 'API_KEYS_MANAGE' as PlatformModuleId, adminOnlyOrPermission: true },
  { href: "/settings/api-docs", label: "API Documentation", icon: Code2, description: "Developer API reference." },
  { href: "/settings/logs", label: "Application Logs", icon: ListOrdered, description: "View system and audit logs.", permissionId: 'LOGS_VIEW' as PlatformModuleId, adminOnlyOrPermission: true },
];

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const canAccess = (item: { adminOnly?: boolean, permissionId?: PlatformModuleId, adminOnlyOrPermission?: boolean }) => {
    if (!isClient || sessionStatus !== 'authenticated') return false;
    if (item.adminOnly && session?.user?.role !== 'Admin') return false;
    if (item.adminOnlyOrPermission) {
      if (session?.user?.role === 'Admin') return true;
      if (item.permissionId && session?.user?.modulePermissions?.includes(item.permissionId)) return true;
      return false;
    }
    if (item.permissionId && session?.user?.role !== 'Admin' && !session?.user?.modulePermissions?.includes(item.permissionId)) return false;
    return true;
  };

  const accessibleItems = isClient ? settingsItems.filter(item => canAccess(item)) : [];

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
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application settings and configurations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accessibleItems.map((item) => (
          <Card 
            key={item.href} 
            className="cursor-pointer hover:shadow-md transition-shadow duration-200 group"
            onClick={() => router.push(item.href)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{item.label}</CardTitle>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                {item.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {accessibleItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No settings available for your current permissions.</p>
        </div>
      )}
    </div>
  );
}
