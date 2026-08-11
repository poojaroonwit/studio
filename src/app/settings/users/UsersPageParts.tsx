"use client";

import { Plus, RefreshCw, ServerCrash, ShieldCheck, UsersRound } from "lucide-react";
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
    <div className="px-6 pb-0 pt-5">
      <div className="mb-3 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">User accounts</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Manage platform accounts, status, and sign-in security.</p>
          </div>
        </div>
        {canCreateUsers && activeTab === "users" && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onSyncFromAD} disabled={isSyncing}>
              <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
              Sync from Azure AD
            </Button>
            <Button size="sm" variant="default" onClick={onAddUser}>
              <Plus className="mr-2 h-4 w-4" /> Add account
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
      <div className="mb-4 flex w-full gap-6 border-b border-border">
        {USER_SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                getUnderlineNavTriggerClassName(activeTab === tab.id),
                "-mb-px h-10 px-1 text-sm",
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
