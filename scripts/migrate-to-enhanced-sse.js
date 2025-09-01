#!/usr/bin/env node

/**
 * Migration Script: Simple SSE to Enhanced SSE
 * 
 * This script helps migrate components from the old useSimpleSSE system
 * to the new enhanced SSE system that loads endpoints one by one.
 * 
 * Usage: node scripts/migrate-to-enhanced-sse.js
 */

const fs = require('fs');
const path = require('path');

// Files that have already been migrated
const migratedFiles = [
  'src/components/dashboard/DashboardPageClient.tsx',
  'src/components/tasks/MyTasksPageClient.tsx',
  'src/components/positions/PositionsPageClient.tsx',
  'src/components/ui/breadcrumb.tsx',
  'src/components/ui/user-presence-indicator.tsx',
  'src/components/ui/simple-sse-status.tsx',
  'src/components/candidates/CandidateImportUploadQueue.tsx',
  'src/components/candidates/hooks/useCandidateDetail.ts',
  'src/components/ui/realtime-collaboration.tsx',
  'src/components/candidates/CandidatesPageClient.tsx',
  'src/contexts/NotificationContext.tsx',
  'src/contexts/WarningContext.tsx',
  'src/hooks/use-realtime-collaboration.ts'
];

// Migration patterns
const migrationPatterns = [
  {
    name: 'Import statements',
    from: /import\s*{\s*useSimpleSSE[^}]*}\s*from\s*['"]@\/hooks\/use-simple-sse['"];?/g,
    to: 'import { useEnhancedSSE, useEnhancedCandidateUpdates, useEnhancedPositionUpdates, useEnhancedUploadQueueUpdates } from \'@/hooks/use-enhanced-sse\';'
  },
  {
    name: 'Hook usage - useSimpleSSE',
    from: /const\s*{\s*([^}]*)\s*}\s*=\s*useSimpleSSE\(\);/g,
    to: 'const { $1 } = useEnhancedSSE();'
  },
  {
    name: 'Hook usage - useCandidateUpdates',
    from: /const\s*{\s*([^}]*)\s*}\s*=\s*useCandidateUpdates\(\);/g,
    to: 'const { $1 } = useEnhancedCandidateUpdates();'
  },
  {
    name: 'Hook usage - usePositionUpdates',
    from: /const\s*{\s*([^}]*)\s*}\s*=\s*usePositionUpdates\(\);/g,
    to: 'const { $1 } = useEnhancedPositionUpdates();'
  },
  {
    name: 'Hook usage - useUploadQueueUpdates',
    from: /const\s*{\s*([^}]*)\s*}\s*=\s*useUploadQueueUpdates\(\);/g,
    to: 'const { $1 } = useEnhancedUploadQueueUpdates();'
  }
];

// Find all TypeScript/TSX files that might use SSE
function findSSEFiles(dir) {
  const files = [];
  
  function scanDirectory(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scanDirectory(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  }
  
  scanDirectory(dir);
  return files;
}

// Check if a file contains SSE usage
function hasSSEUsage(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.includes('useSimpleSSE') || 
           content.includes('useCandidateUpdates') || 
           content.includes('usePositionUpdates') || 
           content.includes('useUploadQueueUpdates');
  } catch (error) {
    return false;
  }
}

// Apply migration patterns to a file
function migrateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    for (const pattern of migrationPatterns) {
      if (pattern.from.test(content)) {
        content = content.replace(pattern.from, pattern.to);
        hasChanges = true;
        console.log(`  ✓ Applied ${pattern.name}`);
      }
    }
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`  ✗ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main migration function
function runMigration() {
  console.log('🚀 Starting Enhanced SSE Migration...\n');
  
  const srcDir = path.join(process.cwd(), 'src');
  const allFiles = findSSEFiles(srcDir);
  const sseFiles = allFiles.filter(hasSSEUsage);
  
  console.log(`Found ${sseFiles.length} files with SSE usage:\n`);
  
  let migratedCount = 0;
  let skippedCount = 0;
  
  for (const filePath of sseFiles) {
    const relativePath = path.relative(process.cwd(), filePath);
    
    if (migratedFiles.includes(relativePath)) {
      console.log(`⏭️  ${relativePath} - Already migrated`);
      skippedCount++;
      continue;
    }
    
    console.log(`🔄 ${relativePath}`);
    const wasMigrated = migrateFile(filePath);
    
    if (wasMigrated) {
      console.log(`  ✅ Migration completed`);
      migratedCount++;
    } else {
      console.log(`  ℹ️  No changes needed`);
    }
    
    console.log('');
  }
  
  console.log('📊 Migration Summary:');
  console.log(`  Total files: ${sseFiles.length}`);
  console.log(`  Migrated: ${migratedCount}`);
  console.log(`  Already migrated: ${skippedCount}`);
  console.log(`  Remaining: ${sseFiles.length - migratedCount - skippedCount}`);
  
  if (migratedCount > 0) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Test the migrated components');
    console.log('2. Check browser console for Enhanced SSE logs');
    console.log('3. Verify no application freezing');
    console.log('4. Add EnhancedSSEStatus component to debug page if needed');
  } else {
    console.log('\n✨ All files are already migrated!');
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration, migrationPatterns };
