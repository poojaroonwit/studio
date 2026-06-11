"use client";

import { ArrowRight, Lock, Settings } from 'lucide-react';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import type { SettingsPageItem } from './settings-page-model';

export function SettingsPageView({
  accessibleItems,
  isLoading,
  onOpenItem,
  showLogoOnly,
}: {
  accessibleItems: SettingsPageItem[];
  isLoading: boolean;
  onOpenItem: (href: string) => void;
  showLogoOnly: boolean;
}) {
  if (isLoading) {
    return <SettingsPageLoadingState />;
  }

  return (
    <div className="h-full flex flex-col settings-page-grid">
      <SettingsPageHeader showLogoOnly={showLogoOnly} />

      <div className="flex-1 p-6 pt-0 overflow-y-auto">
        <div className="space-y-6">
          <SettingsItemsGrid
            accessibleItems={accessibleItems}
            onOpenItem={onOpenItem}
          />

          {accessibleItems.length === 0 && <SettingsPageEmptyState />}
        </div>
      </div>
    </div>
  );
}

function SettingsPageLoadingState() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    </div>
  );
}

function SettingsPageHeader({ showLogoOnly }: { showLogoOnly: boolean }) {
  return (
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
  );
}

function SettingsItemsGrid({
  accessibleItems,
  onOpenItem,
}: {
  accessibleItems: SettingsPageItem[];
  onOpenItem: (href: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {accessibleItems.map((item) => (
        <Card
          key={item.href}
          className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] bg-card/50 hover:bg-card h-48 flex flex-col"
          onClick={() => onOpenItem(item.href)}
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
  );
}

function SettingsPageEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="p-4 rounded-full bg-muted/50 mb-4">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No Settings Available</h3>
      <p className="text-muted-foreground max-w-md">
        You don't have permission to access any settings. Contact your administrator for access.
      </p>
    </div>
  );
}
