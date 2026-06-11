import { PLATFORM_MODULE_CATEGORIES, type PlatformModule } from './platform-module-types';

export const LOGGING_AUDIT_PLATFORM_MODULES: PlatformModule[] = [
  // ===== LOGGING & AUDIT =====

  {
    id: 'LOGS_VIEW',
    label: 'View System Logs',
    category: PLATFORM_MODULE_CATEGORIES.LOGGING_AUDIT,
    description: "View system and audit logs",
    detailedDescription: "Access to view system logs, audit trails, and user activity records.",
    impact: "Read-only access to system logs. Important for compliance and security monitoring.",
    riskLevel: 'LOW'
  },

  {
    id: 'LOGS_EXPORT',
    label: 'Export System Logs',
    category: PLATFORM_MODULE_CATEGORIES.LOGGING_AUDIT,
    description: "Export system logs for analysis",
    detailedDescription: "Ability to export system logs and audit trails for external analysis and compliance reporting.",
    impact: "Can extract log data. Important for compliance and security investigations.",
    riskLevel: 'MEDIUM'
  },

  {
    id: 'APP_PERFORMANCE_VIEW',
    label: 'View Performance Metrics',
    category: PLATFORM_MODULE_CATEGORIES.LOGGING_AUDIT,
    description: "View application performance data",
    detailedDescription: "Access to view application performance metrics, system health indicators, and monitoring data.",
    impact: "Read-only access to performance data. No ability to modify.",
    riskLevel: 'LOW'
  },

];
