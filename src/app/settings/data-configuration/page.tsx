"use client";

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

import {
  DataConfigurationContent,
  DataConfigurationHeader,
  DataConfigurationLimitedAccessBanner,
  DataConfigurationSidebar,
} from './DataConfigurationPageParts';
import {
  buildDataConfigurationNavigationGroups,
  DATA_CONFIGURATION_CALLBACK_URL,
  DEFAULT_DATA_CONFIGURATION_PAGE,
  getAllowedDataConfigurationPage,
  getDataConfigurationLimitedAccessMessage,
  isShowLogoOnlyEnabled,
  type DataConfigurationPageId,
} from './data-configuration-page-utils';
import { hasAnyPermission } from '@/lib/permissions';
import { readJsonObject } from '@/lib/response-json';

export default function DataConfigurationPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [showLogoOnly, setShowLogoOnly] = useState<boolean>(false);
  const [activePage, setActivePage] = useState<DataConfigurationPageId>(DEFAULT_DATA_CONFIGURATION_PAGE);

  const canManageStages = hasAnyPermission(session?.user, ['RECRUITMENT_STAGES_EDIT']);
  const canManageCustomFields = hasAnyPermission(session?.user, ['CUSTOM_FIELDS_EDIT']);
  const limitedAccessMessage = getDataConfigurationLimitedAccessMessage(canManageStages, canManageCustomFields);
  const navigationGroups = buildDataConfigurationNavigationGroups(canManageStages, canManageCustomFields);

  useEffect(() => {
    const allowedPage = getAllowedDataConfigurationPage(activePage, canManageStages);

    if (allowedPage !== activePage) {
      setActivePage(allowedPage);
    }
  }, [activePage, canManageStages]);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      signIn(undefined, { callbackUrl: DATA_CONFIGURATION_CALLBACK_URL });
    }
  }, [sessionStatus]);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      const fetchShowLogoOnly = async () => {
        try {
          const response = await fetch('/api/settings/system-settings');
          if (response.ok) {
            const data = await readJsonObject(response);
            setShowLogoOnly(isShowLogoOnlyEnabled(data.showLogoOnly));
          }
        } catch (error) {
          console.error('Error fetching showLogoOnly setting:', error);
        }
      };
      fetchShowLogoOnly();
    }
  }, [sessionStatus]);

  if (sessionStatus === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (sessionStatus === 'unauthenticated') {
    return null;
  }

  return (
    <div className="h-full flex flex-col p-6">
      <DataConfigurationHeader showLogoOnly={showLogoOnly} />
      <DataConfigurationLimitedAccessBanner message={limitedAccessMessage} />

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex gap-6">
          <DataConfigurationSidebar
            activePage={activePage}
            navigationGroups={navigationGroups}
            onActivePageChange={setActivePage}
          />
          <DataConfigurationContent
            activePage={activePage}
            canManageCustomFields={canManageCustomFields}
            canManageStages={canManageStages}
          />
        </div>
      </div>
    </div>
  );
}

