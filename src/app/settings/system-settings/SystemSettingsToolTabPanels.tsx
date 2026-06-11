import { ScrollArea } from '@/components/ui/scroll-area';
import AutoCloseTab from '@/components/settings/AutoCloseTab';
import AIPowerSearchTab from '@/components/settings/AIPowerSearchTab';
import AiApiKeysTab from '@/components/settings/AiApiKeysTab';
import SystemApiKeysTab from '@/components/settings/SystemApiKeysTab';
import OrganizationTab from '@/components/settings/system-settings-tabs/OrganizationTab';
import MonitoringTab from '@/components/settings/system-settings-tabs/MonitoringTab';
import AiPromptsTab from '@/components/settings/system-settings-tabs/AiPromptsTab';
import type { SystemSettingsPageState } from './SystemSettingsTabContentTypes';

export function SystemSettingsToolTabPanels({ settingsPage }: { settingsPage: SystemSettingsPageState }) {
  const { activeTab } = settingsPage;

  return (
    <>
      {activeTab === 'auto-close' && (
        <ScrollArea className="h-full">
          <AutoCloseTab />
        </ScrollArea>
      )}

      {activeTab === 'ai-search' && (
        <ScrollArea className="h-full">
          <AIPowerSearchTab />
        </ScrollArea>
      )}

      {activeTab === 'ai-api-keys' && (
        <ScrollArea className="h-full">
          <AiApiKeysTab />
        </ScrollArea>
      )}

      {activeTab === 'ai-prompts' && <SystemSettingsAiPromptsPanel settingsPage={settingsPage} />}

      {activeTab === 'system-api-keys' && settingsPage.isAdmin && (
        <ScrollArea className="h-full">
          <SystemApiKeysTab />
        </ScrollArea>
      )}

      {activeTab === 'monitoring' && <MonitoringTab />}

      {activeTab === 'organize' && <SystemSettingsOrganizationPanel settingsPage={settingsPage} />}
    </>
  );
}

function SystemSettingsAiPromptsPanel({ settingsPage }: { settingsPage: SystemSettingsPageState }) {
  return (
    <AiPromptsTab
      jobDescriptionSystemPrompt={settingsPage.jobDescriptionSystemPrompt}
      setJobDescriptionSystemPrompt={settingsPage.setJobDescriptionSystemPrompt}
      applicantEvaluationCriteriaPrompt={settingsPage.applicantEvaluationCriteriaPrompt}
      setApplicantEvaluationCriteriaPrompt={settingsPage.setApplicantEvaluationCriteriaPrompt}
      isSaving={settingsPage.isSaving}
    />
  );
}

function SystemSettingsOrganizationPanel({ settingsPage }: { settingsPage: SystemSettingsPageState }) {
  return (
    <OrganizationTab
      organizationName={settingsPage.organizationName}
      setOrganizationName={settingsPage.setOrganizationName}
      organizationAddress={settingsPage.organizationAddress}
      setOrganizationAddress={settingsPage.setOrganizationAddress}
      organizationContact={settingsPage.organizationContact}
      setOrganizationContact={settingsPage.setOrganizationContact}
      organizationLogoPreviewUrl={settingsPage.organizationLogoPreviewUrl}
      setOrganizationLogoPreviewUrl={settingsPage.setOrganizationLogoPreviewUrl}
      setSavedOrganizationLogoUrl={settingsPage.setSavedOrganizationLogoUrl}
      isSaving={settingsPage.isSaving}
    />
  );
}
