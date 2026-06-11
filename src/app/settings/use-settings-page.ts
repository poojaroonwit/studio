"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';

import { checkPermission } from '@/lib/permissions';
import type { PlatformModuleId } from '@/lib/types';
import { readJsonObject } from '@/lib/response-json';

import { settingsItems, type SettingsPageItem } from './settings-page-model';

type SettingsPageSessionUser = {
  role?: string | null;
  modulePermissions?: PlatformModuleId[] | null;
};

export function useSettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [isClient, setIsClient] = useState(false);
  const [showLogoOnly, setShowLogoOnly] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !isClient) return;

    const fetchShowLogoOnly = async () => {
      try {
        const response = await fetch('/api/settings/system-settings');
        if (response.ok) {
          const data = await readJsonObject(response);
          setShowLogoOnly(data.showLogoOnly === 'true' || data.showLogoOnly === true);
        }
      } catch (error) {
        console.error('Error fetching showLogoOnly setting:', error);
      }
    };

    fetchShowLogoOnly();
  }, [sessionStatus, isClient]);

  const accessibleItems = useMemo(() => {
    if (!isClient || !Array.isArray(settingsItems)) {
      return [];
    }

    return settingsItems.filter((item) => {
      try {
        return canAccessSettingsItem({
          item,
          isClient,
          sessionStatus,
          user: session?.user as SettingsPageSessionUser | undefined,
        });
      } catch (error) {
        console.warn('Settings page: Error filtering settings item:', error, item);
        return false;
      }
    });
  }, [isClient, session?.user, sessionStatus]);

  return {
    accessibleItems,
    isLoading: sessionStatus === 'loading' || !isClient,
    showLogoOnly,
  };
}

function canAccessSettingsItem({
  item,
  isClient,
  sessionStatus,
  user,
}: {
  item: SettingsPageItem;
  isClient: boolean;
  sessionStatus: string;
  user?: SettingsPageSessionUser;
}) {
  if (!isClient || sessionStatus !== 'authenticated' || !user) {
    return false;
  }

  if (item.adminOnly) {
    return false;
  }

  const userRole = user.role || 'Recruiter';
  const modulePermissions = Array.isArray(user.modulePermissions)
    ? user.modulePermissions
    : [];

  if (item.adminOnlyOrPermission) {
    return Boolean(
      item.permissionId &&
      checkPermission(userRole, modulePermissions, item.permissionId)
    );
  }

  if (item.permissionId) {
    return checkPermission(userRole, modulePermissions, item.permissionId);
  }

  return true;
}
