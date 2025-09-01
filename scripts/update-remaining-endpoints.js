#!/usr/bin/env node

/**
 * Auto-generated script to update role-based checks to permission-based checks
 * Generated on: 2025-09-01T11:48:14.784Z
 */

import { hasPermission, hasAnyPermission } from '../src/lib/permissions';

// TODO: Update the following files to use permission-based access control:


// File: src\app\api\upload-queue\route.ts
// Pattern: session\.user\.role\s*===\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\upload-queue\route.ts
// Pattern: user\.role\s*===\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\candidates\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\candidates\route.ts
// Pattern: session\.user\.role\s*===\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\candidates\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\candidates\route.ts
// Pattern: user\.role\s*===\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\users\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\positions\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\settings\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\notifications\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\logs\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\candidates\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\user-preferences\[userId]\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\user-preferences\[userId]\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\upload-queue\[id]\route.ts
// Pattern: session\.user\.role\s*===\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\upload-queue\[id]\route.ts
// Pattern: user\.role\s*===\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\upload-queue\bulk-action\route.ts
// Pattern: session\.user\.role\s*===\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\upload-queue\bulk-action\route.ts
// Pattern: user\.role\s*===\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\transitions\[id]\route.ts
// Pattern: session\.user\.role\s*===\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\transitions\[id]\route.ts
// Pattern: user\.role\s*===\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\setup\check-minio-bucket\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\setup\check-minio-bucket\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\system-prompts\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\system-prompts\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\system-prompt-categories\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\system-prompt-categories\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\recruitment-stages\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\recruitment-stages\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\sync-user-roles\route.ts
// Pattern: session\.user\.role\s*===\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\sync-user-roles\route.ts
// Pattern: user\.role\s*===\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\headcount-types\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\headcount-types\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\custom-field-definitions\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\custom-field-definitions\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\resumes\upload\route.ts
// Pattern: session\.user\.role\s*===\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\resumes\upload\route.ts
// Pattern: user\.role\s*===\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\positions\[id]\route.ts
// Pattern: role\s*!==\s*['"]Recruiter['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\positions\bulk-action\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\positions\bulk-action\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\positions\auto-close\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\positions\auto-close\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\candidates\[id]\route.ts
// Pattern: session\.user\.role\s*===\s*['"]Admin['"]
// Matches: 3
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\candidates\[id]\route.ts
// Pattern: user\.role\s*===\s*['"]Admin['"]
// Matches: 3
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\candidates\import\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\candidates\import\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\candidates\fit-score-counts\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\candidates\fit-score-counts\route.ts
// Pattern: session\.user\.role\s*===\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\candidates\fit-score-counts\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\candidates\fit-score-counts\route.ts
// Pattern: user\.role\s*===\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\candidates\export\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\candidates\export\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\candidates\bulk-action\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\candidates\bulk-action\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\ai\save-word-to-attachment\route.ts
// Pattern: session\.user\.role\s*===\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\ai\save-word-to-attachment\route.ts
// Pattern: user\.role\s*===\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\users\[id]\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 3
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\users\[id]\warning-configurations\route.ts
// Pattern: session\.user\.role\s*===\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\users\[id]\warning-configurations\route.ts
// Pattern: user\.role\s*===\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\positions\[id]\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\positions\import\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\positions\export\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\positions\bulk-action\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\candidates\import\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\candidates\export\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\candidates\[id]\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\candidates\bulk-upload-cv\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\candidates\bulk-action\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\system-prompts\[id]\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 3
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\system-prompts\[id]\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 3
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\webhooks\analytics\route.ts
// Pattern: session\.user\.role\s*===\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\webhooks\analytics\route.ts
// Pattern: user\.role\s*===\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\recruitment-stages\reorder\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\recruitment-stages\reorder\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\system-prompt-categories\[id]\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 3
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\system-prompt-categories\[id]\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 3
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\recruitment-stages\[id]\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\recruitment-stages\[id]\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\custom-field-definitions\[id]\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\custom-field-definitions\[id]\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\candidates\[id]\export\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\candidates\[id]\export\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\candidates\[id]\comments\route.ts
// Pattern: session\.user\.role\s*===\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\candidates\[id]\comments\route.ts
// Pattern: user\.role\s*===\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\candidates\[id]\avatar\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\candidates\[id]\avatar\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\users\[id]\warning-configurations\[configId]\route.ts
// Pattern: session\.user\.role\s*===\s*['"]Admin['"]
// Matches: 3
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\users\[id]\warning-configurations\[configId]\route.ts
// Pattern: user\.role\s*===\s*['"]Admin['"]
// Matches: 3
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\users\[id]\warning-configurations\bulk\route.ts
// Pattern: session\.user\.role\s*===\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\users\[id]\warning-configurations\bulk\route.ts
// Pattern: user\.role\s*===\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\candidates\[id]\source\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\candidates\[id]\recruiter\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 2
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\candidates\[id]\recruiter\route.ts
// Pattern: role\s*!==\s*['"]Recruiter['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\candidates\[id]\job-matches\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 5
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\candidates\[id]\avatar\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\candidates\[id]\job-applied\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 3
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\candidates\[id]\attachments\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 4
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\user-groups\[id]\available-users\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\user-groups\[id]\available-users\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\user-groups\[id]\members\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 3
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\user-groups\[id]\members\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 3
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\user-teams\[id]\available-users\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\user-teams\[id]\available-users\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\user-teams\[id]\members\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 3
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\user-teams\[id]\members\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 3
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\recruitment-stages\[id]\move\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\recruitment-stages\[id]\move\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\recruitment-stages\[id]\migrate\route.ts
// Pattern: session\.user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\settings\recruitment-stages\[id]\migrate\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\candidates\[id]\job-matches\[matchId]\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 3
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


// File: src\app\api\v1\candidates\[id]\job-matches\add\route.ts
// Pattern: user\.role\s*!==\s*['"]Admin['"]
// Matches: 1
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))


console.log('✅ Please review and update the files listed above');
console.log('📖 See docs/permission-based-access-control-migration.md for guidance');
