import type { SystemSettingsPageState } from './SystemSettingsTabContentTypes';
import {
  SystemSettingsAzurePanel,
  SystemSettingsEmailServerPanel,
  SystemSettingsEmailTemplatesPanel,
  SystemSettingsFeatureFlagsPanel,
  SystemSettingsMatchCriteriaPanel,
  SystemSettingsProcessingPanel,
  SystemSettingsPwaPanel,
  SystemSettingsSecurityPanel,
} from './SystemSettingsCoreTabPanelParts';

export function SystemSettingsCoreTabPanels({ settingsPage }: { settingsPage: SystemSettingsPageState }) {
  switch (settingsPage.activeTab) {
    case 'processing':
      return <SystemSettingsProcessingPanel settingsPage={settingsPage} />;
    case 'security':
      return <SystemSettingsSecurityPanel settingsPage={settingsPage} />;
    case 'email-server':
      return <SystemSettingsEmailServerPanel settingsPage={settingsPage} />;
    case 'email-templates':
      return <SystemSettingsEmailTemplatesPanel settingsPage={settingsPage} />;
    case 'pwa':
      return <SystemSettingsPwaPanel settingsPage={settingsPage} />;
    case 'match-criteria':
      return <SystemSettingsMatchCriteriaPanel settingsPage={settingsPage} />;
    case 'features':
      return <SystemSettingsFeatureFlagsPanel settingsPage={settingsPage} />;
    case 'azure':
      return <SystemSettingsAzurePanel settingsPage={settingsPage} />;
    default:
      return null;
  }
}
