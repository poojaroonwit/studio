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

// Simple patterns to search for and replace - ONLY for Candidate-related operations
const patterns = [
  // Direct field access on candidate objects
  { from: /candidate\.statusId/g, to: 'candidate.status' },
  { from: /c\.statusId/g, to: 'c.status' },
  { from: /existing\.statusId/g, to: 'existing.status' },
  { from: /updatedCandidate\.statusId/g, to: 'updatedCandidate.status' },
  { from: /newCandidate\.statusId/g, to: 'newCandidate.status' },
  { from: /candidateData\.statusId/g, to: 'candidateData.status' },
];

// Only process essential files to avoid build issues
const essentialFiles = [
  'src/components/candidates/**/*.tsx',
  'src/components/candidates/**/*.ts',
  'src/app/api/candidates/**/*.ts',
  'src/app/api/v1/candidates/**/*.ts',
  'src/lib/candidateUtils.ts',
  'src/hooks/use-candidate-*.ts',
  'src/hooks/use-candidate-*.tsx'
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
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting targeted component update to use status field...\n');
  
  try {
    let updatedCount = 0;
    let errorCount = 0;
    
    // Process only essential candidate-related files
    for (const filePattern of essentialFiles) {
      try {
        const files = await glob(filePattern, { 
          ignore: ['**/node_modules/**', '**/dist/**', '**/.next/**'] 
        });
        
        for (const file of files) {
          if (fs.existsSync(file)) {
            const result = await updateFile(file);
            if (result === true) {
              updatedCount++;
            }
          }
        }
      } catch (error) {
        console.log(`⚠️  Skipping pattern ${filePattern}: ${error.message}`);
      }
    }
    
    console.log(`\n🎉 Component update completed!`);
    console.log(`📊 Summary:`);
    console.log(`✅ Files updated: ${updatedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Simple glob implementation to avoid dependency issues
async function glob(pattern, options = {}) {
  const { ignore = [] } = options;
  const files = [];
  
  function walkDir(dir, pattern) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDir(fullPath, pattern);
      } else if (stat.isFile() && pattern.includes('**')) {
        const relativePath = path.relative('.', fullPath);
        if (relativePath.includes('candidates') && (relativePath.endsWith('.ts') || relativePath.endsWith('.tsx'))) {
          files.push(relativePath);
        }
      }
    }
  }
  
  walkDir('src', pattern);
  return files;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, patterns };
