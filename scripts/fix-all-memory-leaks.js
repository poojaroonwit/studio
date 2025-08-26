#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing All Memory Leaks...\n');

// Critical memory leak patterns to fix
const memoryLeakFixes = [
  {
    name: 'setTimeout without clearTimeout in useEffect',
    pattern: /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*setTimeout\s*\(\s*\(\)\s*=>\s*\{[^}]*\}\s*,\s*\d+\s*\)[^}]*\}\s*\)/gs,
    replacement: (match) => {
      // Extract the timeout content and delay
      const timeoutMatch = match.match(/setTimeout\s*\(\s*\(\)\s*=>\s*\{([^}]*)\}\s*,\s*(\d+)\s*\)/);
      if (timeoutMatch) {
        const content = timeoutMatch[1];
        const delay = timeoutMatch[2];
        return match.replace(
          /setTimeout\s*\(\s*\(\)\s*=>\s*\{([^}]*)\}\s*,\s*(\d+)\s*\)/,
          `const timeoutId = setTimeout(() => {
          ${content}
        }, ${delay});
        
        return () => {
          clearTimeout(timeoutId);
        };`
        );
      }
      return match;
    },
    files: ['src/components/**/*.tsx', 'src/hooks/**/*.ts', 'src/contexts/**/*.tsx']
  },
  {
    name: 'setInterval without clearInterval in useEffect',
    pattern: /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*setInterval\s*\(\s*\(\)\s*=>\s*\{[^}]*\}\s*,\s*\d+\s*\)[^}]*\}\s*\)/gs,
    replacement: (match) => {
      const intervalMatch = match.match(/setInterval\s*\(\s*\(\)\s*=>\s*\{([^}]*)\}\s*,\s*(\d+)\s*\)/);
      if (intervalMatch) {
        const content = intervalMatch[1];
        const delay = intervalMatch[2];
        return match.replace(
          /setInterval\s*\(\s*\(\)\s*=>\s*\{([^}]*)\}\s*,\s*(\d+)\s*\)/,
          `const intervalId = setInterval(() => {
          ${content}
        }, ${delay});
        
        return () => {
          clearInterval(intervalId);
        };`
        );
      }
      return match;
    },
    files: ['src/components/**/*.tsx', 'src/hooks/**/*.ts', 'src/contexts/**/*.tsx']
  },
  {
    name: 'EventSource without close in useEffect',
    pattern: /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*const\s+(\w+)\s*=\s*new\s+EventSource\s*\([^)]*\)[^}]*\}\s*\)/gs,
    replacement: (match, varName) => {
      return match.replace(
        /\}\s*\)/,
        `}
        
        return () => {
          if (${varName}) {
            ${varName}.close();
          }
        };
      )`
      );
    },
    files: ['src/components/**/*.tsx', 'src/hooks/**/*.ts', 'src/contexts/**/*.tsx']
  },
  {
    name: 'AbortController without abort in useEffect',
    pattern: /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*const\s+(\w+)\s*=\s*new\s+AbortController\s*\(\)[^}]*\}\s*\)/gs,
    replacement: (match, varName) => {
      return match.replace(
        /\}\s*\)/,
        `}
        
        return () => {
          if (${varName}) {
            ${varName}.abort();
          }
        };
      )`
      );
    },
    files: ['src/components/**/*.tsx', 'src/hooks/**/*.ts', 'src/contexts/**/*.tsx']
  }
];

// Specific file fixes
const specificFileFixes = [
  {
    file: 'src/components/candidates/CandidateFilters.tsx',
    fixes: [
      {
        pattern: /setTimeout\s*\(\s*\(\)\s*=>\s*\{[^}]*setIsApplyingFilters\s*\(\s*false\s*\)[^}]*\}\s*,\s*100\s*\)/g,
        replacement: `const timeoutId = setTimeout(() => {
          setIsApplyingFilters(false);
        }, 100);
        
        return () => {
          clearTimeout(timeoutId);
        };`
      }
    ]
  },
  {
    file: 'src/components/candidates/CandidateImportUploadQueue.tsx',
    fixes: [
      {
        pattern: /const interval = setInterval\s*\(\s*\(\)\s*=>\s*\{[^}]*setCurrentTime\s*\(\s*new\s+Date\s*\(\)\s*\)[^}]*\}\s*,\s*1000\s*\)/g,
        replacement: `const interval = setInterval(() => {
          setCurrentTime(new Date());
        }, 1000);
        
        return () => clearInterval(interval);`
      }
    ]
  }
];

function applyFixes() {
  let totalFixes = 0;
  
  // Apply specific file fixes
  specificFileFixes.forEach(({ file, fixes }) => {
    if (!fs.existsSync(file)) {
      console.log(`⚠️  File not found: ${file}`);
      return;
    }
    
    let content = fs.readFileSync(file, 'utf8');
    let fileModified = false;
    
    fixes.forEach((fix, index) => {
      if (content.includes(fix.pattern.source)) {
        content = content.replace(fix.pattern, fix.replacement);
        fileModified = true;
        totalFixes++;
        console.log(`✅ Applied fix ${index + 1} to ${file}`);
      }
    });
    
    if (fileModified) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`💾 Updated ${file}`);
    }
  });
  
  return totalFixes;
}

// Apply the fixes
const fixesApplied = applyFixes();
console.log(`\n🎉 Applied ${fixesApplied} memory leak fixes!`);
console.log('\n📋 Next steps:');
console.log('1. Test the application thoroughly');
console.log('2. Monitor memory usage in browser dev tools');
console.log('3. Check for any remaining console warnings');
console.log('4. Consider implementing the performance monitoring utilities');
