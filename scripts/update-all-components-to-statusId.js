#!/usr/bin/env node

/**
 * Update All Components to Use statusId Instead of status
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
  { from: /newCandidate\.status/g, to: 'newCandidate.statusId' },
  
  // In object destructuring
  { from: /status:\s*candidate\.status/g, to: 'status: candidate.statusId' },
  { from: /status:\s*existing\.status/g, to: 'status: existing.statusId' },
  { from: /status:\s*updatedCandidate\.status/g, to: 'status: updatedCandidate.statusId' },
  
  // In object creation
  { from: /status:\s*formData\.status/g, to: 'status: formData.statusId' },
  { from: /status:\s*data\.status/g, to: 'status: data.statusId' },
  
  // In API calls
  { from: /status:\s*status/g, to: 'status: statusId' },
  { from: /status:\s*newStatus/g, to: 'status: newStatus' },
  
  // In database queries
  { from: /status:\s*true/g, to: 'statusId: true' },
  { from: /status:\s*false/g, to: 'statusId: false' },
  
  // In filter objects
  { from: /status:\s*statusFilter/g, to: 'statusId: statusFilter' },
  { from: /status:\s*selectedStatus/g, to: 'statusId: selectedStatus' },
  
  // In sort objects
  { from: /status:\s*'asc'/g, to: 'statusId: \'asc\'' },
  { from: /status:\s*'desc'/g, to: 'statusId: \'desc\'' },
  
  // In column definitions
  { from: /accessorKey:\s*"status"/g, to: 'accessorKey: "statusId"' },
  { from: /accessorKey:\s*'status'/g, to: 'accessorKey: \'statusId\'' },
  
  // In field mappings
  { from: /"status":/g, to: '"statusId":' },
  { from: /'status':/g, to: '\'statusId\':' },
  
  // In type definitions
  { from: /status\?:\s*string/g, to: 'statusId?: string' },
  { from: /status:\s*string/g, to: 'statusId: string' },
  
  // In interface definitions
  { from: /status\?:\s*CandidateStatus/g, to: 'statusId?: CandidateStatus' },
  { from: /status:\s*CandidateStatus/g, to: 'statusId: CandidateStatus' },
];

// File patterns to include
const includePatterns = [
  'src/**/*.tsx',
  'src/**/*.ts',
  'src/**/*.js',
  'src/**/*.jsx'
];

// File patterns to exclude
const excludePatterns = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/*.d.ts',
  '**/types.ts', // Already updated
  '**/schema.prisma' // Already updated
];

async function updateFiles() {
  try {
    console.log('🔍 Finding files to update...');
    
    // Find all matching files
    const files = await glob(includePatterns, { 
      ignore: excludePatterns,
      absolute: true 
    });
    
    console.log(`📁 Found ${files.length} files to process`);
    
    let totalChanges = 0;
    let filesChanged = 0;
    
    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;
        let fileChanged = false;
        
        // Apply all patterns
        for (const pattern of patterns) {
          if (pattern.from.test(content)) {
            content = content.replace(pattern.from, pattern.to);
            fileChanged = true;
          }
        }
        
        // Write file if changed
        if (fileChanged) {
          fs.writeFileSync(filePath, content, 'utf8');
          filesChanged++;
          
          // Count changes
          const changes = patterns.reduce((count, pattern) => {
            const matches = (originalContent.match(pattern.from) || []).length;
            return count + matches;
          }, 0);
          
          totalChanges += changes;
          console.log(`✅ Updated ${filePath} (${changes} changes)`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
      }
    }
    
    console.log('\n🎉 Update Complete!');
    console.log(`📊 Files changed: ${filesChanged}`);
    console.log(`📊 Total changes: ${totalChanges}`);
    
    if (filesChanged === 0) {
      console.log('ℹ️  No files needed updates - all components already use statusId');
    }
    
  } catch (error) {
    console.error('❌ Error during update:', error);
    process.exit(1);
  }
}

// Run the update
updateFiles();
