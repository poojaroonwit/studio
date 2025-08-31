#!/usr/bin/env node

/**
 * Script to apply click protection to all components
 * This script identifies components that need click protection and applies the useClickProtection hook
 */

const fs = require('fs');
const path = require('path');

// Components that need click protection
const componentsToProtect = [
  // Settings components
  'src/components/settings/CandidateSourceModal.tsx',
  'src/components/settings/GradesTab.tsx',
  'src/app/settings/system-settings/page.tsx',
  
  // Candidate components
  'src/components/candidates/AddCandidateModal.tsx',
  'src/components/candidates/ManageTransitionsModal.tsx',
  'src/components/positions/PositionDetailDrawer.tsx',
  
  // File upload components
  'src/components/ui/FileUploadArea.tsx',
  
  // Other components with forms or actions
  'src/components/users/UnifiedUserModal.tsx',
  'src/components/auth/CredentialsSignInForm.tsx',
  'src/components/settings/SystemPreferencesForm.tsx'
];

// Patterns to look for
const patterns = {
  // Import patterns
  imports: [
    /import.*useState.*from.*react/,
    /import.*Button.*from.*@\/components\/ui\/button/,
    /import.*useForm.*from.*react-hook-form/
  ],
  
  // Function patterns
  functions: [
    /const\s+\w+\s*=\s*async\s*\(/,
    /const\s+\w+\s*=\s*\(.*\)\s*=>\s*async/,
    /onSubmit\s*=\s*async/,
    /handleSubmit\s*=\s*async/,
    /handleClick\s*=\s*async/,
    /handleSave\s*=\s*async/,
    /handleDelete\s*=\s*async/,
    /handleCreate\s*=\s*async/,
    /handleUpdate\s*=\s*async/
  ],
  
  // Button patterns
  buttons: [
    /<Button.*onClick/,
    /<button.*onClick/,
    /type="submit"/
  ]
};

function checkComponent(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let needsProtection = false;
  let hasClickProtection = false;
  let issues = [];
  
  // Check if already has click protection
  if (content.includes('useClickProtection')) {
    hasClickProtection = true;
  }
  
  // Check for async functions
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for async functions that might need protection
    patterns.functions.forEach(pattern => {
      if (pattern.test(line)) {
        needsProtection = true;
        issues.push(`Line ${i + 1}: Async function found - ${line.trim()}`);
      }
    });
    
    // Check for buttons with onClick
    patterns.buttons.forEach(pattern => {
      if (pattern.test(line)) {
        needsProtection = true;
        issues.push(`Line ${i + 1}: Button with onClick found - ${line.trim()}`);
      }
    });
  }
  
  return {
    needsProtection,
    hasClickProtection,
    issues
  };
}

function generateProtectionCode(componentName) {
  return `
// Add this import at the top with other imports
import { useClickProtection } from '@/hooks/use-click-protection';

// Add this hook inside the component function
const { isActioning, handleProtectedAsyncClick } = useClickProtection({
  actionName: '${componentName.toLowerCase()}',
  debounceMs: 200,
  timeoutMs: 500
});

// Wrap async functions with handleProtectedAsyncClick
// Example:
// const handleSave = async () => {
//   await handleProtectedAsyncClick(async () => {
//     // Your existing async code here
//   });
// };

// Update button disabled state to include isActioning
// Example:
// disabled={isLoading || isActioning}
`;
}

function main() {
  console.log('🔍 Checking components for click protection needs...\n');
  
  let totalChecked = 0;
  let needsProtection = 0;
  let alreadyProtected = 0;
  
  componentsToProtect.forEach(filePath => {
    totalChecked++;
    console.log(`📁 Checking: ${filePath}`);
    
    const result = checkComponent(filePath);
    
    if (result.hasClickProtection) {
      console.log('  ✅ Already has click protection');
      alreadyProtected++;
    } else if (result.needsProtection) {
      console.log('  ⚠️  Needs click protection');
      console.log('  Issues found:');
      result.issues.slice(0, 3).forEach(issue => {
        console.log(`    - ${issue}`);
      });
      if (result.issues.length > 3) {
        console.log(`    ... and ${result.issues.length - 3} more issues`);
      }
      needsProtection++;
      
      // Generate protection code
      const componentName = path.basename(filePath, '.tsx');
      console.log('  💡 Protection code:');
      console.log(generateProtectionCode(componentName));
    } else {
      console.log('  ✅ No protection needed');
    }
    
    console.log('');
  });
  
  console.log('📊 Summary:');
  console.log(`  Total components checked: ${totalChecked}`);
  console.log(`  Already protected: ${alreadyProtected}`);
  console.log(`  Need protection: ${needsProtection}`);
  console.log(`  No protection needed: ${totalChecked - alreadyProtected - needsProtection}`);
  
  if (needsProtection > 0) {
    console.log('\n🚀 Next steps:');
    console.log('1. Add useClickProtection import to components that need it');
    console.log('2. Wrap async functions with handleProtectedAsyncClick');
    console.log('3. Update button disabled states to include isActioning');
    console.log('4. Test rapid clicking to ensure protection works');
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkComponent, generateProtectionCode };
