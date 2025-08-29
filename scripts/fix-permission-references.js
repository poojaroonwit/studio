#!/usr/bin/env node

/**
 * Permission Reference Fix Script
 * 
 * This script automatically updates permission references in the codebase
 * to use the correct permissions instead of undefined ones.
 */

const fs = require('fs');
const path = require('path');

// Permission mapping for deprecated/incorrect permissions
const PERMISSION_MAPPINGS = {
  // Map undefined permissions to valid ones
  'USERS_MANAGE': ['USERS_VIEW', 'USERS_CREATE', 'USERS_EDIT', 'USERS_DELETE', 'USERS_PERMISSIONS_MANAGE'],
  'AUTOMATION_UPLOAD': ['BULK_UPLOAD_EXECUTE'],
  'WEBHOOK_MAPPING_MANAGE': ['WEBHOOKS_EDIT'],
  'CANDIDATES_MANAGE': ['CANDIDATES_VIEW', 'CANDIDATES_CREATE', 'CANDIDATES_EDIT_BASIC', 'CANDIDATES_EDIT_SENSITIVE'],
  'POSITIONS_MANAGE': ['POSITIONS_VIEW', 'POSITIONS_CREATE', 'POSITIONS_EDIT_BASIC', 'POSITIONS_EDIT_DETAILED'],
  'USER_GROUPS_MANAGE': ['USER_GROUPS_VIEW', 'USER_GROUPS_CREATE', 'USER_GROUPS_EDIT', 'USER_GROUPS_DELETE'],
  'CUSTOM_FIELDS_MANAGE': ['CUSTOM_FIELDS_VIEW', 'CUSTOM_FIELDS_EDIT'],
  'AI_INTEGRATION_MANAGE': ['AI_INTEGRATION_VIEW', 'AI_INTEGRATION_EDIT'],
  'BULK_UPLOAD': ['BULK_UPLOAD_EXECUTE'],
  'WEBHOOK_ANALYTICS_MANAGE': ['WEBHOOK_ANALYTICS_VIEW'],
  'LOGS_MANAGE': ['LOGS_VIEW', 'LOGS_EXPORT'],
  'APP_PERFORMANCE_MANAGE': ['APP_PERFORMANCE_VIEW'],
  'SYSTEM_SETTINGS_MANAGE': ['SYSTEM_SETTINGS_VIEW', 'SYSTEM_SETTINGS_EDIT'],
  'RECRUITMENT_STAGES_MANAGE': ['RECRUITMENT_STAGES_VIEW', 'RECRUITMENT_STAGES_EDIT'],
  'UPLOAD_QUEUE_MANAGE': ['UPLOAD_QUEUE_VIEW', 'UPLOAD_QUEUE_MANAGE'],
  'WEBHOOKS_MANAGE': ['WEBHOOKS_VIEW', 'WEBHOOKS_EDIT'],
  'DASHBOARD_MANAGE': ['DASHBOARD_VIEW'],
  'REPORTS_MANAGE': ['REPORTS_GENERATE'],
  'WARNING_CONFIGURATIONS_MANAGE': ['WARNING_CONFIGURATIONS_VIEW', 'WARNING_CONFIGURATIONS_MANAGE'],
  'USER_PREFERENCES_MANAGE': ['USER_PREFERENCES_MANAGE_OWN', 'USER_PREFERENCES_MANAGE_ALL']
};

// Files to process
const FILES_TO_PROCESS = [
  'src/app/settings/layout.tsx',
  'src/app/settings/page.tsx',
  'src/components/users/UnifiedUserModal.tsx',
  'src/components/layout/SidebarNav.tsx',
  'src/components/dashboard/DashboardPageClient.tsx',
  'src/components/tasks/MyTasksPageClient.tsx',
  'src/components/candidates/AutomationUploadModal.tsx',
  'src/components/candidates/BulkUploadCVsModal.tsx',
  'src/components/candidates/JobMatchModal.tsx',
  'src/components/candidates/tabs/JobMatchTab.tsx',
  'src/components/candidates/tabs/JobsTab.tsx',
  'src/components/settings/UserGroupsTab.tsx',
  'src/app/my-tasks/page.tsx'
];

function createPermissionCheck(newPermissions) {
  if (newPermissions.length === 1) {
    return `session?.user?.modulePermissions?.includes('${newPermissions[0]}')`;
  } else {
    return newPermissions.map(p => `session?.user?.modulePermissions?.includes('${p}')`).join(' || ');
  }
}

function fixPermissionReference(content, oldPermission, newPermissions) {
  const patterns = [
    // Pattern 1: modulePermissions?.includes('PERMISSION')
    new RegExp(`modulePermissions\\?\\.[^)]*includes\\('${oldPermission}'\\)`, 'g'),
    // Pattern 2: modulePermissions?.includes("PERMISSION")
    new RegExp(`modulePermissions\\?\\.[^)]*includes\\("${oldPermission}"\\)`, 'g'),
    // Pattern 3: permissionId: 'PERMISSION'
    new RegExp(`permissionId:\\s*['"]${oldPermission}['"]`, 'g'),
    // Pattern 4: 'PERMISSION' in arrays
    new RegExp(`['"]${oldPermission}['"]`, 'g')
  ];

  let updatedContent = content;
  let replacements = 0;

  for (const pattern of patterns) {
    const matches = updatedContent.match(pattern);
    if (matches) {
      if (pattern.source.includes('includes')) {
        // For permission checks, create a proper OR condition
        const newCheck = createPermissionCheck(newPermissions);
        updatedContent = updatedContent.replace(pattern, newCheck);
        replacements += matches.length;
      } else if (pattern.source.includes('permissionId')) {
        // For permissionId, use the first permission (most restrictive)
        updatedContent = updatedContent.replace(pattern, `permissionId: '${newPermissions[0]}'`);
        replacements += matches.length;
      } else {
        // For array entries, replace with all new permissions
        const newPermissionsString = newPermissions.map(p => `'${p}'`).join(', ');
        updatedContent = updatedContent.replace(pattern, newPermissionsString);
        replacements += matches.length;
      }
    }
  }

  return { content: updatedContent, replacements };
}

function processFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return { filePath, processed: false, replacements: 0 };
  }

  console.log(`📝 Processing: ${filePath}`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let totalReplacements = 0;
    let changes = [];

    for (const [oldPermission, newPermissions] of Object.entries(PERMISSION_MAPPINGS)) {
      const result = fixPermissionReference(content, oldPermission, newPermissions);
      if (result.replacements > 0) {
        content = result.content;
        totalReplacements += result.replacements;
        changes.push({
          old: oldPermission,
          new: newPermissions,
          count: result.replacements
        });
      }
    }

    if (totalReplacements > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ Updated ${totalReplacements} references`);
      for (const change of changes) {
        console.log(`    🔄 ${change.old} → [${change.new.join(', ')}] (${change.count} times)`);
      }
      return { filePath, processed: true, replacements: totalReplacements, changes };
    } else {
      console.log(`  ℹ️  No changes needed`);
      return { filePath, processed: true, replacements: 0 };
    }

  } catch (error) {
    console.error(`  ❌ Error processing ${filePath}:`, error.message);
    return { filePath, processed: false, error: error.message };
  }
}

function main() {
  console.log('🔧 Starting Permission Reference Fix...\n');

  const results = [];
  let totalFilesProcessed = 0;
  let totalFilesUpdated = 0;
  let totalReplacements = 0;

  for (const filePath of FILES_TO_PROCESS) {
    const result = processFile(filePath);
    results.push(result);
    
    if (result.processed) {
      totalFilesProcessed++;
      if (result.replacements > 0) {
        totalFilesUpdated++;
        totalReplacements += result.replacements;
      }
    }
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log(`  • Files Processed: ${totalFilesProcessed}`);
  console.log(`  • Files Updated: ${totalFilesUpdated}`);
  console.log(`  • Total Replacements: ${totalReplacements}`);

  // Show detailed changes
  console.log('\n📝 Detailed Changes:');
  for (const result of results) {
    if (result.processed && result.replacements > 0) {
      console.log(`\n  📄 ${result.filePath}:`);
      for (const change of result.changes) {
        console.log(`    🔄 ${change.old} → [${change.new.join(', ')}] (${change.count} times)`);
      }
    }
  }

  // Show files that need manual review
  const filesWithErrors = results.filter(r => !r.processed);
  if (filesWithErrors.length > 0) {
    console.log('\n⚠️  Files that need manual review:');
    for (const file of filesWithErrors) {
      console.log(`  • ${file.filePath}: ${file.error}`);
    }
  }

  console.log('\n✅ Permission reference fix completed!');
  console.log('\n💡 Next steps:');
  console.log('  1. Review the changes made to ensure they are correct');
  console.log('  2. Test the application to ensure permissions work as expected');
  console.log('  3. Run the database migration script: node scripts/fix-permission-alignment.js');
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { processFile, fixPermissionReference, PERMISSION_MAPPINGS };
