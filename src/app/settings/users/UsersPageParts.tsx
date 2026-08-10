"use client";

import { PlusCircle, RefreshCw, ServerCrash, ShieldCheck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getUnderlineNavTriggerClassName } from "@/components/ui/underline-nav";
import { UserGroupsTab } from "@/components/settings/UserGroupsTab";

export type UsersSettingsTabId = "users" | "groups";

interface UsersPageHeaderProps {
  activeTab: UsersSettingsTabId;
  canCreateUsers: boolean;
  isSyncing: boolean;
  onSyncFromAD: () => void;
  onAddUser: () => void;
}

export function UsersPageHeader({
  activeTab,
  canCreateUsers,
  isSyncing,
  onSyncFromAD,
  onAddUser,
}: UsersPageHeaderProps) {
  return (
    <div className="p-4 pb-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">User Management</h1>
            <p className="text-muted-foreground">Manage users, roles, and access permissions</p>
          </div>
        </div>
        {canCreateUsers && activeTab === "users" && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={onSyncFromAD} disabled={isSyncing}>
              <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
              Sync from Azure AD
            </Button>
            <Button variant="default" onClick={onAddUser}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New User
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

interface UsersPageTabsProps {
  activeTab: UsersSettingsTabId;
  onTabChange: (tab: UsersSettingsTabId) => void;
}

const USER_SETTINGS_TABS = [
  { id: "users", label: "Users", icon: UsersRound },
  { id: "groups", label: "Roles & Permissions", icon: ShieldCheck },
] satisfies Array<{
  id: UsersSettingsTabId;
  label: string;
  icon: typeof UsersRound;
}>;

export function UsersPageTabs({ activeTab, onTabChange }: UsersPageTabsProps) {
  return (
    <div className="px-6">
      <div className="flex w-full border-b-2 border-zinc-200 dark:border-zinc-800 mb-4 gap-6">
        {USER_SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                getUnderlineNavTriggerClassName(activeTab === tab.id),
                "px-1 h-12 -mb-px",
              )}
            >
              <Icon className="h-4 w-4" /> {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function UserTabErrorState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <ServerCrash className="w-16 h-16 text-destructive mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
    </div>
  );
}

export function SafeGroupsTab() {
  try {
    return <UserGroupsTab />;
  } catch (error) {
    console.error("Failed to load UserGroupsTab:", error);
    return (
      <UserTabErrorState
        title="Error Loading Roles"
        description="Failed to load groups component"
      />
    );
  }
}
