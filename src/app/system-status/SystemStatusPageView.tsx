"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { HardDrive, Info, Loader2, Settings } from "lucide-react";
import type { StatusItem } from './system-status-types';
import {
  getSystemStatusBadgeVariant,
  getSystemStatusColor,
  getSystemStatusToggleIcon,
} from './system-status-utils';
import type { SystemStatusPageModel } from './use-system-status-page';

export function SystemStatusPageView({ page }: { page: SystemStatusPageModel }) {
  if (page.isLoading) {
    return (
      <div className="flex w-screen items-center justify-center bg-background fixed inset-0 z-50">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Settings className="mr-3 h-7 w-7 text-primary" />
            System Status & Configuration Overview
          </CardTitle>
          <CardDescription>
            Overview of key application dependencies, their expected setup, and how to verify their status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {page.statuses.length === 0 && <p>Loading status checks...</p>}
          {page.statuses.map((item) => (
            <SystemStatusCard
              key={item.id}
              canCheckStorageBucket={page.canCheckStorageBucket}
              item={item}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SystemStatusCard({
  canCheckStorageBucket,
  item,
}: {
  canCheckStorageBucket: boolean;
  item: StatusItem;
}) {
  const Icon = item.icon;
  const storageActionDisabled = item.id === 'storage_bucket_check' && !canCheckStorageBucket;

  return (
    <Card className="p-4 shadow-sm bg-card hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-foreground flex items-center">
          <Icon className={`mr-2 h-5 w-5 shrink-0 ${getSystemStatusColor(item.status)}`} />
          {item.name}
        </h3>
        <Badge variant={getSystemStatusBadgeVariant(item.status)} className={cn(
          'self-start sm:self-center whitespace-nowrap',
          { 'bg-green-500/80 text-primary-foreground': item.status === 'ok' || item.status === 'enabled' },
          { 'bg-yellow-400/80 text-secondary-foreground': item.status === 'warning' },
          { 'bg-red-500/80 text-destructive-foreground': item.status === 'error' || item.status === 'disabled' }
        )}>
          {item.status.toUpperCase()}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mt-1 ml-7 sm:ml-0">{item.message}</p>
      {item.details && (
        <div className="mt-2 p-3 bg-muted/50 border border-muted rounded-md text-xs text-muted-foreground ml-7 sm:ml-0">
          <Info className="inline-block h-3.5 w-3.5 mr-1.5 relative -top-px" />
          {item.details}
        </div>
      )}
      {item.action && item.actionLabel && (
        <div className="mt-3 ml-7 sm:ml-0">
          <Button
            onClick={item.action}
            disabled={item.isLoading || storageActionDisabled}
            variant="outline"
            size="sm"
            className={cn(
              "btn-hover-primary-gradient",
              item.id === 'azure_ad_sso_conceptual' && item.status === 'enabled' && 'bg-green-500 hover:bg-green-600 text-white border-green-600',
              item.id === 'azure_ad_sso_conceptual' && item.status === 'disabled' && 'bg-muted hover:bg-muted/70 text-white border-border'
            )}
          >
            {getSystemStatusActionIcon(item)}
            {item.isLoading ? "Processing..." : item.actionLabel}
          </Button>
          {storageActionDisabled && (
            <p className="text-xs text-destructive mt-1">Admin role or SYSTEM_SETTINGS_VIEW permission required to perform this check.</p>
          )}
        </div>
      )}
    </Card>
  );
}

function getSystemStatusActionIcon(item: StatusItem) {
  if (item.isLoading) {
    return <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
  }

  if (item.id === 'azure_ad_sso_conceptual') {
    return getSystemStatusToggleIcon(item.status);
  }

  if (item.id === 'storage_bucket_check') {
    return <HardDrive className="mr-2 h-4 w-4" />;
  }

  return null;
}
