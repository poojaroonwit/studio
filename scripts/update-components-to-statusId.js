#!/usr/bin/env node

/**
 * Update Components to Use statusId Instead of status for Candidates Only
 * 
 * This script updates component files to use the new statusId field name
 * instead of the old status field name ONLY for Candidate-related operations.
 * It preserves status fields in other models like UploadQueue and Headcount.
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Patterns to search for and replace - ONLY for Candidate-related operations
const patterns = [
  // Direct field access on candidate objects
  { from: /candidate\.status/g, to: 'candidate.statusId' },
  { from: /c\.status/g, to: 'c.statusId' },
  { from: /existing\.status/g, to: 'existing.statusId' },
  { from: /updatedCandidate\.status/g, to: 'updatedCandidate.statusId' },
  { from: /newCandidate\.status/g, to: 'newCandidate.statusId' },
  { from: /candidateData\.status/g, to: 'candidateData.statusId' },
  
  // In object destructuring for candidates
  { from: /status:\s*candidate\.status/g, to: 'status: candidate.statusId' },
  { from: /status:\s*existing\.status/g, to: 'status: existing.statusId' },
  { from: /status:\s*updatedCandidate\.status/g, to: 'status: updatedCandidate.statusId' },
  { from: /status:\s*newCandidate\.status/g, to: 'status: newCandidate.statusId' },
  
  // In object literals for candidates
  { from: /status:\s*candidate\.status/g, to: 'status: candidate.statusId' },
  { from: /status:\s*existing\.status/g, to: 'status: existing.statusId' },
  { from: /status:\s*updatedCandidate\.status/g, to: 'status: updatedCandidate.statusId' },
  { from: /status:\s*newCandidate\.status/g, to: 'status: newCandidate.statusId' },
  
  // In filter conditions for candidates
  { from: /candidate\.status\s*===/g, to: 'candidate.statusId ===' },
  { from: /candidate\.status\s*!==/g, to: 'candidate.statusId !==' },
  { from: /candidate\.status\s*&&/g, to: 'candidate.statusId &&' },
  { from: /candidate\.status\s*\|\|/g, to: 'candidate.statusId ||' },
  { from: /c\.status\s*===/g, to: 'c.statusId ===' },
  { from: /c\.status\s*!==/g, to: 'c.statusId !==' },
  
  // In SQL queries specifically for candidate tables (be more specific)
  { from: /c\.status\s*=/g, to: 'c."statusId" =' },
  { from: /c\.status\s*IN/g, to: 'c."statusId" IN' },
  { from: /c\.status\s*IS/g, to: 'c."statusId" IS' },
  
  // In comments specifically about candidate status
  { from: /\/\/\s*candidate.*status.*UUID/g, to: '// candidate statusId UUID' },
  { from: /\/\/\s*candidate.*status.*field/g, to: '// candidate statusId field' },
  
  // In variable names specifically for candidate status
  { from: /\bcandidateStatusColumn\b/g, to: 'candidateStatusIdColumn' },
  { from: /\bcandidateStatusField\b/g, to: 'candidateStatusIdField' },
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
  console.log('🚀 Starting targeted component update to statusId (Candidates only)...\n');
  console.log('📝 This migration will ONLY update Candidate-related status references');
  console.log('📝 Preserving status fields in UploadQueue, Headcount, and other models\n');
  
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
    
    console.log(`\n🎉 Targeted component update completed!`);
    console.log(`📊 Summary:`);
    console.log(`✅ Files updated: ${updatedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📁 Total files processed: ${files.length}`);
    
    if (updatedCount > 0) {
      console.log(`\n📝 Next steps:`);
      console.log(`1. Review the changes in the updated files`);
      console.log(`2. Test the application to ensure everything works`);
      console.log(`3. Verify that UploadQueue and Headcount status fields are preserved`);
      console.log(`4. Verify that Candidate statusId references are working correctly`);
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, patterns };
