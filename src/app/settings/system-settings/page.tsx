"use client";
import { useRouter } from 'next/navigation';
import { Loader2, ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SystemSettingsHeader } from './SystemSettingsHeader';
import {
  SystemSettingsMobileNavigation,
  SystemSettingsSidebarNavigation,
} from './SystemSettingsNavigation';
import { SystemSettingsTabContent } from './SystemSettingsTabContent';
import { useSystemSettingsPage } from './use-system-settings-page';

export default function SystemSettingsPage() {
  const router = useRouter();
  const settingsPage = useSystemSettingsPage();
  const {
    activeTab,
    fetchError,
    fetchSystemSettings,
    handleSave,
    isAdmin,
    isLoading,
    isSaving,
    sessionStatus,
    setActiveTab,
    showLogoOnly,
  } = settingsPage;

  if (sessionStatus === 'loading' || (isLoading && !fetchError)) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  if (fetchError && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Access Denied or Error</h2>
        <p className="text-muted-foreground mb-4 max-w-md">{fetchError}</p>
        <Button onClick={() => router.push('/')} className="btn-hover-primary-gradient">Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      <SystemSettingsHeader
        showLogoOnly={showLogoOnly}
        isSaving={isSaving}
        onReset={fetchSystemSettings}
        onSave={handleSave}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <SystemSettingsMobileNavigation
            activeTab={activeTab}
            isAdmin={isAdmin}
            onTabChange={setActiveTab}
          />
          <div className="flex h-full border rounded-lg overflow-hidden bg-background">
            <SystemSettingsSidebarNavigation
              activeTab={activeTab}
              isAdmin={isAdmin}
              onTabChange={setActiveTab}
            />

            <SystemSettingsTabContent settingsPage={settingsPage} />
          </div>
        </div>
      </div>
    </div>
  );
}
