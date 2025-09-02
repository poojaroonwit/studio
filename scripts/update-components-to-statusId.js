#!/usr/bin/env node

/**
 * Update Components to Use status Instead of statusId for Candidates
 * 
 * This script updates component files to use the status field name
 * for Candidate-related operations, maintaining consistency with the Prisma schema.
 * It preserves status fields in other models like UploadQueue and Headcount.
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Patterns to search for and replace - ONLY for Candidate-related operations
const patterns = [
  // Direct field access on candidate objects
  { from: /candidate\.statusId/g, to: 'candidate.status' },
  { from: /c\.statusId/g, to: 'c.status' },
  { from: /existing\.statusId/g, to: 'existing.status' },
  { from: /updatedCandidate\.statusId/g, to: 'updatedCandidate.status' },
  { from: /newCandidate\.statusId/g, to: 'newCandidate.status' },
  { from: /candidateData\.statusId/g, to: 'candidateData.status' },
  
  // In object destructuring for candidates
  { from: /statusId:\s*candidate\.statusId/g, to: 'status: candidate.status' },
  { from: /statusId:\s*existing\.statusId/g, to: 'status: existing.status' },
  { from: /statusId:\s*updatedCandidate\.statusId/g, to: 'status: updatedCandidate.status' },
  { from: /statusId:\s*newCandidate\.statusId/g, to: 'status: newCandidate.status' },
  
  // In object literals for candidates
  { from: /statusId:\s*candidate\.statusId/g, to: 'status: candidate.status' },
  { from: /statusId:\s*existing\.statusId/g, to: 'status: existing.status' },
  { from: /statusId:\s*updatedCandidate\.statusId/g, to: 'status: updatedCandidate.status' },
  { from: /statusId:\s*newCandidate\.statusId/g, to: 'status: newCandidate.status' },
  
  // In filter conditions for candidates
  { from: /candidate\.statusId\s*===/g, to: 'candidate.status ===' },
  { from: /candidate\.statusId\s*!==/g, to: 'candidate.status !==' },
  { from: /candidate\.statusId\s*&&/g, to: 'candidate.status &&' },
  { from: /candidate\.statusId\s*\|\|/g, to: 'candidate.status ||' },
  { from: /c\.statusId\s*===/g, to: 'c.status ===' },
  { from: /c\.statusId\s*!==/g, to: 'c.status !==' },
  
  // In SQL queries specifically for candidate tables (be more specific)
  { from: /c\.statusId\s*=/g, to: 'c."status" =' },
  { from: /c\.statusId\s*IN/g, to: 'c."status" IN' },
  { from: /c\.statusId\s*IS/g, to: 'c."status" IS' },
  
  // In comments specifically about candidate status
  { from: /\/\/\s*candidate.*statusId.*UUID/g, to: '// candidate status UUID' },
  { from: /\/\/\s*candidate.*statusId.*field/g, to: '// candidate status field' },
  
  // In variable names specifically for candidate status
  { from: /\bcandidateStatusIdColumn\b/g, to: 'candidateStatusColumn' },
  { from: /\bcandidateStatusIdField\b/g, to: 'candidateStatusField' },
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
  console.log('🚀 Starting component update to use status field (Candidates)...\n');
  console.log('📝 This migration will update Candidate-related statusId references to status');
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
    
    console.log(`\n🎉 Component update completed!`);
    console.log(`📊 Summary:`);
    console.log(`✅ Files updated: ${updatedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📁 Total files processed: ${files.length}`);
    
    if (updatedCount > 0) {
      console.log(`\n📝 Next steps:`);
      console.log(`1. Review the changes in the updated files`);
      console.log(`2. Test the application to ensure everything works`);
      console.log(`3. Verify that UploadQueue and Headcount status fields are preserved`);
      console.log(`4. Verify that Candidate status references are working correctly`);
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, patterns };
