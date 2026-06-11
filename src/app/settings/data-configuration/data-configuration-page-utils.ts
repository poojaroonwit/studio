export type DataConfigurationPageId =
  | 'Applicant-sources'
  | 'custom-fields'
  | 'position-grades'
  | 'position-headcount'
  | 'position-levels'
  | 'recruitment-stages';

export type DataConfigurationIconKey =
  | 'customFields'
  | 'grades'
  | 'headcount'
  | 'levels'
  | 'sources'
  | 'stages';

export interface DataConfigurationNavigationItem {
  icon: DataConfigurationIconKey;
  id: DataConfigurationPageId;
  label: string;
}

export interface DataConfigurationNavigationGroup {
  items: DataConfigurationNavigationItem[];
  title: string;
}

export const DEFAULT_DATA_CONFIGURATION_PAGE: DataConfigurationPageId = 'recruitment-stages';
export const DATA_CONFIGURATION_FALLBACK_PAGE: DataConfigurationPageId = 'Applicant-sources';
export const DATA_CONFIGURATION_CALLBACK_URL = '/settings/data-configuration';

export function getAllowedDataConfigurationPage(
  activePage: DataConfigurationPageId,
  canManageStages: boolean
): DataConfigurationPageId {
  if (activePage === DEFAULT_DATA_CONFIGURATION_PAGE && !canManageStages) {
    return DATA_CONFIGURATION_FALLBACK_PAGE;
  }

  return activePage;
}

export function getDataConfigurationLimitedAccessMessage(
  canManageStages: boolean,
  canManageCustomFields: boolean
) {
  if (canManageStages && canManageCustomFields) {
    return null;
  }

  if (!canManageStages && !canManageCustomFields) {
    return "You don't have permission to manage recruitment stages or custom fields. Contact your administrator to request the necessary permissions.";
  }

  if (!canManageStages) {
    return "You don't have permission to manage recruitment stages. Contact your administrator to request the necessary permissions.";
  }

  return "You don't have permission to manage custom fields. Contact your administrator to request the necessary permissions.";
}

export function buildDataConfigurationNavigationGroups(
  canManageStages: boolean,
  canManageCustomFields: boolean
): DataConfigurationNavigationGroup[] {
  return [
    {
      title: 'Applicant',
      items: [
        ...(canManageStages ? [{
          id: 'recruitment-stages' as const,
          label: 'Recruitment Stages',
          icon: 'stages' as const,
        }] : []),
        {
          id: 'Applicant-sources',
          label: 'Applicant Sources',
          icon: 'sources',
        },
      ],
    },
    {
      title: 'Position',
      items: [
        {
          id: 'position-headcount',
          label: 'Headcount Types',
          icon: 'headcount',
        },
        {
          id: 'position-grades',
          label: 'Grades',
          icon: 'grades',
        },
        {
          id: 'position-levels',
          label: 'Position Levels',
          icon: 'levels',
        },
      ],
    },
    ...(canManageCustomFields ? [{
      title: 'System',
      items: [
        {
          id: 'custom-fields' as const,
          label: 'Custom Fields',
          icon: 'customFields' as const,
        },
      ],
    }] : []),
  ];
}

export function isShowLogoOnlyEnabled(value: unknown) {
  return value === true || value === 'true';
}
