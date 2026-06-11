import type { ComponentType } from 'react';
import {
  BrainCircuit,
  Code2,
  Database,
  ListOrdered,
  Palette,
  Target,
  UsersRound,
  Webhook,
} from 'lucide-react';

import type { PlatformModuleId } from '@/lib/types';

export interface SettingsPageItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
  permissionId?: PlatformModuleId;
  adminOnly?: boolean;
  adminOnlyOrPermission?: boolean;
}

export const settingsItems: SettingsPageItem[] = [
  {
    href: '/settings/system-settings',
    label: 'System Settings',
    icon: Database,
    description: 'System-wide configuration, integrations, automation, and upload queue processing settings.',
    permissionId: 'SYSTEM_SETTINGS_VIEW',
    adminOnlyOrPermission: true,
  },
  {
    href: '/settings/system-preferences',
    label: 'Branding & Theme',
    icon: Palette,
    description: 'Global branding, theme, and logo settings.',
    permissionId: 'SYSTEM_SETTINGS_VIEW',
    adminOnlyOrPermission: true,
  },
  {
    href: '/settings/system-prompts',
    label: 'System Prompts & Categories',
    icon: BrainCircuit,
    description: 'Manage AI system prompts and their categories.',
    permissionId: 'SYSTEM_SETTINGS_VIEW',
    adminOnlyOrPermission: true,
  },
  {
    href: '/settings/data-configuration',
    label: 'Data Configuration',
    icon: Database,
    description: 'Manage custom fields, recruitment stages, and Applicant sources.',
    permissionId: 'RECRUITMENT_STAGES_VIEW',
    adminOnlyOrPermission: true,
  },
  {
    href: '/settings/evaluation-configuration',
    label: 'Evaluation Configuration',
    icon: Target,
    description: 'Configure evaluation modules, expertise skills, and personality assessments.',
    permissionId: 'SYSTEM_SETTINGS_VIEW',
    adminOnlyOrPermission: true,
  },
  {
    href: '/settings/webhooks',
    label: 'Webhook Management',
    icon: Webhook,
    description: 'Create and manage outgoing webhooks.',
    permissionId: 'WEBHOOKS_EDIT',
    adminOnlyOrPermission: true,
  },
  {
    href: '/settings/users',
    label: 'User Management',
    icon: UsersRound,
    description: 'Manage users, roles, permissions, and teams.',
    permissionId: 'USERS_VIEW',
    adminOnlyOrPermission: true,
  },
  {
    href: '/settings/api-docs',
    label: 'API Documentation',
    icon: Code2,
    description: 'Developer API reference and documentation.',
  },
  {
    href: '/settings/logs',
    label: 'Application Logs',
    icon: ListOrdered,
    description: 'View system and audit logs.',
    permissionId: 'LOGS_VIEW',
    adminOnlyOrPermission: true,
  },
  {
    href: '/settings/rooms',
    label: 'Meeting Room',
    icon: Target,
    description: 'Manage integrated meeting rooms from Azure AD.',
    permissionId: 'SYSTEM_SETTINGS_VIEW',
    adminOnlyOrPermission: true,
  },
];
