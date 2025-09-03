#!/usr/bin/env node

/**
 * Script to update remaining API endpoints to use permission-based access control
 * This script helps identify and update endpoints that still use role-based checks
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Patterns to search for role-based checks
const ROLE_BASED_PATTERNS = [
  /session\.user\.role\s*!==\s*['"]Admin['"]/g,
  /session\.user\.role\s*===\s*['"]Admin['"]/g,
  /user\.role\s*!==\s*['"]Admin['"]/g,
  /user\.role\s*===\s*['"]Admin['"]/g,
  /role\s*!==\s*['"]Recruiter['"]/g,
  /role\s*===\s*['"]Recruiter['"]/g,
  /role\s*!==\s*['"]Hiring Manager['"]/g,
  /role\s*===\s*['"]Hiring Manager['"]/g,
];

// Files to exclude from search
const EXCLUDE_PATTERNS = [
  'node_modules/**',
  'dist/**',
  'build/**',
  '.next/**',
  '*.log',
  '*.sql',
  '*.md',
  'docs/**',
  'scripts/**',
  'migration-*.sql',
];

// Permission mapping for common role-based checks
const PERMISSION_MAPPINGS = {
  'USERS_MANAGE': ['USERS_VIEW', 'USERS_CREATE', 'USERS_EDIT', 'USERS_DELETE'],
  'CANDIDATES_MANAGE': ['CANDIDATES_VIEW', 'CANDIDATES_CREATE', 'CANDIDATES_EDIT_BASIC'],
  'POSITIONS_MANAGE': ['POSITIONS_VIEW', 'POSITIONS_CREATE', 'POSITIONS_EDIT_BASIC'],
  'SYSTEM_SETTINGS': ['SYSTEM_SETTINGS_VIEW', 'SYSTEM_SETTINGS_EDIT'],
  'LOGS_VIEW': ['LOGS_VIEW'],
  'UPLOAD_QUEUE_MANAGE': ['UPLOAD_QUEUE_MANAGE'],
  'WEBHOOKS_EDIT': ['WEBHOOKS_EDIT'],
  'CUSTOM_FIELDS_MANAGE': ['CUSTOM_FIELDS_VIEW', 'CUSTOM_FIELDS_EDIT'],
};

async function findRoleBasedChecks() {

  
  const apiFiles = await glob('src/app/api/**/*.{ts,tsx}', {
    ignore: EXCLUDE_PATTERNS,
    absolute: true
  });
  
  const results = [];
  
  for (const file of apiFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(process.cwd(), file);
    
    for (const pattern of ROLE_BASED_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        results.push({
          file: relativePath,
          matches: matches,
          pattern: pattern.source
        });
      }
    }
  }
  
  return results;
}

function generateUpdateSuggestions(results) {

  
  const suggestions = [];
  
  for (const result of results) {
    // Generate suggestions based on file path
    const suggestions = generateSuggestionsForFile(result.file, result.matches);
  }
  
  return suggestions;
}

function generateSuggestionsForFile(filePath, matches) {
  const suggestions = [];
  
  // Determine context based on file path
  if (filePath.includes('/candidates/')) {
    suggestions.push('Use hasPermission(userRole, userPermissions, "CANDIDATES_VIEW") for view access');
    suggestions.push('Use hasPermission(userRole, userPermissions, "CANDIDATES_CREATE") for create access');
    suggestions.push('Use hasPermission(userRole, userPermissions, "CANDIDATES_EDIT_BASIC") for edit access');
    suggestions.push('Use hasPermission(userRole, userPermissions, "CANDIDATES_DELETE") for delete access');
  } else if (filePath.includes('/positions/')) {
    suggestions.push('Use hasPermission(userRole, userPermissions, "POSITIONS_VIEW") for view access');
    suggestions.push('Use hasPermission(userRole, userPermissions, "POSITIONS_CREATE") for create access');
    suggestions.push('Use hasPermission(userRole, userPermissions, "POSITIONS_EDIT_BASIC") for edit access');
    suggestions.push('Use hasPermission(userRole, userPermissions, "POSITIONS_DELETE") for delete access');
  } else if (filePath.includes('/users/')) {
    suggestions.push('Use hasPermission(user, "USERS_VIEW") for view access');
    suggestions.push('Use hasPermission(user, "USERS_CREATE") for create access');
    suggestions.push('Use hasPermission(user, "USERS_EDIT") for edit access');
    suggestions.push('Use hasPermission(user, "USERS_DELETE") for delete access');
  } else if (filePath.includes('/settings/')) {
    suggestions.push('Use hasPermission(user, "SYSTEM_SETTINGS_VIEW") for view access');
    suggestions.push('Use hasPermission(user, "SYSTEM_SETTINGS_EDIT") for edit access');
  } else if (filePath.includes('/logs/')) {
    suggestions.push('Use hasPermission(user, "LOGS_VIEW") for view access');
    suggestions.push('Use hasPermission(user, "LOGS_EXPORT") for export access');
  } else if (filePath.includes('/upload-queue/')) {
    suggestions.push('Use hasPermission(user, "UPLOAD_QUEUE_MANAGE") for management access');
  } else {
    suggestions.push('Use hasPermission(user, "RELEVANT_PERMISSION") for specific access');
    suggestions.push('Use hasAnyPermission(user, ["PERM1", "PERM2"]) for multiple permissions');
  }
  
  return suggestions;
}

function generateMigrationScript(results) {

  
  const scriptContent = `#!/usr/bin/env node

/**
 * Auto-generated script to update role-based checks to permission-based checks
 * Generated on: ${new Date().toISOString()}
 */

import { hasPermission, hasAnyPermission } from '@/lib/permissions';

// TODO: Update the following files to use permission-based access control:

${results.map(result => `
// File: ${result.file}
// Pattern: ${result.pattern}
// Matches: ${result.matches.length}
// TODO: Replace role-based checks with permission-based checks
// Example:
// OLD: if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USERS_MANAGE'))
// NEW: if (!hasPermission(session.user.role, session.user.modulePermissions, 'USERS_MANAGE'))
`).join('\n')}

console.log('✅ Please review and update the files listed above');
console.log('📖 See docs/permission-based-access-control-migration.md for guidance');
`;

  const scriptPath = 'scripts/update-remaining-endpoints.js';
  fs.writeFileSync(scriptPath, scriptContent);
  console.log(`✅ Generated migration script: ${scriptPath}`);
  
  return scriptPath;
}

async function main() {
  try {
    console.log('🚀 Starting role-based check analysis...\n');
    
    // Find role-based checks
    const results = await findRoleBasedChecks();
    
    if (results.length === 0) {
      console.log('✅ No role-based checks found! The codebase is already using permission-based access control.');
      return;
    }
    
    // Generate suggestions
    generateUpdateSuggestions(results);
    
    // Generate migration script
    const scriptPath = generateMigrationScript(results);
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Review the files listed above');
    console.log('2. Update each file to use the new permission system');
    console.log('3. Import hasPermission and hasAnyPermission from @/lib/permissions');
    console.log('4. Replace role-based checks with permission-based checks');
    console.log('5. Test the updated endpoints');
    console.log(`6. Run the generated script: node ${scriptPath}`);
    
    console.log('\n📖 For detailed guidance, see: docs/permission-based-access-control-migration.md');
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Analysis completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { findRoleBasedChecks, generateUpdateSuggestions };
