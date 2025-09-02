#!/usr/bin/env node

/**
 * Update Components to Use statusId Instead of status
 * 
 * This script updates all component files to use the new statusId field name
 * instead of the old status field name for candidates.
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Patterns to search for and replace
const patterns = [
  // Direct field access
  { from: /candidate\.status/g, to: 'candidate.statusId' },
  { from: /c\.status/g, to: 'c.statusId' },
  { from: /existing\.status/g, to: 'existing.statusId' },
  { from: /updatedCandidate\.status/g, to: 'updatedCandidate.statusId' },
  
  // In object destructuring
  { from: /status:\s*candidate\.status/g, to: 'status: candidate.statusId' },
  { from: /status:\s*existing\.status/g, to: 'status: existing.statusId' },
  { from: /status:\s*updatedCandidate\.status/g, to: 'status: updatedCandidate.statusId' },
  
  // In object literals
  { from: /status:\s*candidate\.status/g, to: 'status: candidate.statusId' },
  { from: /status:\s*existing\.status/g, to: 'status: existing.statusId' },
  { from: /status:\s*updatedCandidate\.status/g, to: 'status: updatedCandidate.statusId' },
  
  // In filter conditions
  { from: /candidate\.status\s*===/g, to: 'candidate.statusId ===' },
  { from: /candidate\.status\s*!==/g, to: 'candidate.statusId !==' },
  { from: /candidate\.status\s*&&/g, to: 'candidate.statusId &&' },
  { from: /candidate\.status\s*\|\|/g, to: 'candidate.statusId ||' },
  
  // In SQL queries (string literals)
  { from: /c\.status/g, to: 'c."statusId"' },
  { from: /WHERE\s+status\s*=/g, to: 'WHERE "statusId" =' },
  { from: /WHERE\s+status\s*IN/g, to: 'WHERE "statusId" IN' },
  { from: /WHERE\s+status\s*IS/g, to: 'WHERE "statusId" IS' },
  { from: /ORDER\s+BY\s+status/g, to: 'ORDER BY "statusId"' },
  { from: /GROUP\s+BY\s+status/g, to: 'GROUP BY "statusId"' },
  
  // In comments
  { from: /\/\/\s*status\s*UUID/g, to: '// statusId UUID' },
  { from: /\/\/\s*status\s*field/g, to: '// statusId field' },
  
  // In variable names (be careful with this one)
  { from: /\bstatusColumn\b/g, to: 'statusIdColumn' },
  { from: /\bstatusField\b/g, to: 'statusIdField' },
];

// Files to process
const filePatterns = [
  'src/components/**/*.tsx',
  'src/components/**/*.ts',
  'src/app/**/*.ts',
  'src/app/**/*.tsx',
  'src/lib/**/*.ts',
  'src/hooks/**/*.ts',
  'src/hooks/**/*.tsx'
];

// Files to exclude
const excludePatterns = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.next/**',
  '**/*.d.ts',
  '**/types.ts', // Already updated
  '**/fix-candidate-status-uuid.js' // Already updated
];

async function updateFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let updatedContent = content;
    let hasChanges = false;
    
    // Apply all patterns
    for (const pattern of patterns) {
      if (pattern.from.test(updatedContent)) {
        updatedContent = updatedContent.replace(pattern.from, pattern.to);
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  No changes needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting component update to statusId...\n');
  
  try {
    // Find all matching files
    const files = await glob(filePatterns, { ignore: excludePatterns });
    console.log(`📁 Found ${files.length} files to process\n`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    // Process each file
    for (const file of files) {
      const result = await updateFile(file);
      if (result === true) {
        updatedCount++;
      } else if (result === false && file.includes('status')) {
        // Check if file might need manual review
        console.log(`🔍 Manual review recommended: ${file}`);
      }
    }
    
    console.log(`\n🎉 Component update completed!`);
    console.log(`📊 Summary:`);
    console.log(`✅ Files updated: ${updatedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📁 Total files processed: ${files.length}`);
    
    if (updatedCount > 0) {
      console.log(`\n📝 Next steps:`);
      console.log(`1. Review the changes in the updated files`);
      console.log(`2. Test the application to ensure everything works`);
      console.log(`3. Run the database migration: npm run fix:candidate-status`);
      console.log(`4. Verify that candidate statuses now display as names instead of UUIDs`);
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, patterns };
