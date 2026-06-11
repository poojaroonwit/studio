import AzureIntegrationTab from '@/components/settings/system-settings-tabs/AzureIntegrationTab';
import FeatureFlagsTab from '@/components/settings/system-settings-tabs/FeatureFlagsTab';
import MatchCriteriaTab from '@/components/settings/system-settings-tabs/MatchCriteriaTab';
import PwaTab from '@/components/settings/system-settings-tabs/PwaTab';
import type { SystemSettingsCorePanelProps } from './SystemSettingsCoreTabPanelTypes';

export function SystemSettingsPwaPanel({ settingsPage }: SystemSettingsCorePanelProps) {
  return (
    <PwaTab
      pwaEnabled={settingsPage.pwaEnabled}
      setPwaEnabled={settingsPage.setPwaEnabled}
      pwaName={settingsPage.pwaName}
      setPwaName={settingsPage.setPwaName}
      pwaShortName={settingsPage.pwaShortName}
      setPwaShortName={settingsPage.setPwaShortName}
      pwaDescription={settingsPage.pwaDescription}
      setPwaDescription={settingsPage.setPwaDescription}
      pwaThemeColor={settingsPage.pwaThemeColor}
      setPwaThemeColor={settingsPage.setPwaThemeColor}
      pwaBackgroundColor={settingsPage.pwaBackgroundColor}
      setPwaBackgroundColor={settingsPage.setPwaBackgroundColor}
      pwaAppleMobileWebAppTitle={settingsPage.pwaAppleMobileWebAppTitle}
      setPwaAppleMobileWebAppTitle={settingsPage.setPwaAppleMobileWebAppTitle}
      pwaAppleMobileWebAppStatusBarStyle={settingsPage.pwaAppleMobileWebAppStatusBarStyle}
      setPwaAppleMobileWebAppStatusBarStyle={settingsPage.setPwaAppleMobileWebAppStatusBarStyle}
      isSaving={settingsPage.isSaving}
    />
  );
}

export function SystemSettingsMatchCriteriaPanel({ settingsPage }: SystemSettingsCorePanelProps) {
  return (
    <MatchCriteriaTab
      defaultMatchCriteria={settingsPage.defaultMatchCriteria}
      setDefaultMatchCriteria={settingsPage.setDefaultMatchCriteria}
      isSaving={settingsPage.isSaving}
      isEditorReady={settingsPage.isEditorReady}
    />
  );
}

export function SystemSettingsFeatureFlagsPanel({ settingsPage }: SystemSettingsCorePanelProps) {
  return (
    <FeatureFlagsTab
      jobMatchFeatureEnabled={settingsPage.jobMatchFeatureEnabled}
      setJobMatchFeatureEnabled={settingsPage.setJobMatchFeatureEnabled}
      exportImportFeatureEnabled={settingsPage.exportImportFeatureEnabled}
      setExportImportFeatureEnabled={settingsPage.setExportImportFeatureEnabled}
      hiringManagerRestrictToAssignedPositions={settingsPage.hiringManagerRestrictToAssignedPositions}
      setHiringManagerRestrictToAssignedPositions={settingsPage.setHiringManagerRestrictToAssignedPositions}
      interviewInvitationFeatureEnabled={settingsPage.interviewInvitationFeatureEnabled}
      setInterviewInvitationFeatureEnabled={settingsPage.setInterviewInvitationFeatureEnabled}
      isSaving={settingsPage.isSaving}
    />
  );
}

export function SystemSettingsAzurePanel({ settingsPage }: SystemSettingsCorePanelProps) {
  return (
    <AzureIntegrationTab
      azureAdClientId={settingsPage.azureAdClientId}
      setAzureAdClientId={settingsPage.setAzureAdClientId}
      azureAdClientSecret={settingsPage.azureAdClientSecret}
      setAzureAdClientSecret={settingsPage.setAzureAdClientSecret}
      azureAdTenantId={settingsPage.azureAdTenantId}
      setAzureAdTenantId={settingsPage.setAzureAdTenantId}
      azureMeetingRoomsEnabled={settingsPage.azureMeetingRoomsEnabled}
      setAzureMeetingRoomsEnabled={settingsPage.setAzureMeetingRoomsEnabled}
      showAzureSecret={settingsPage.showAzureSecret}
      setShowAzureSecret={settingsPage.setShowAzureSecret}
      testingAzureRooms={settingsPage.testingAzureRooms}
      setTestingAzureRooms={settingsPage.setTestingAzureRooms}
      isSaving={settingsPage.isSaving}
    />
  );
}
