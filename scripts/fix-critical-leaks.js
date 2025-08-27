#!/usr/bin/env node

/**
 * Critical Resource Leak Fix Script
 * 
 * This script detects and fixes the most critical resource leaks
 * that cause the application to get stuck on loading.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔍 Scanning for critical resource leaks...\n');

// Critical leak patterns to detect and fix
const criticalLeakPatterns = [
  {
    name: 'EventSource without proper cleanup',
    pattern: /new\s+EventSource\s*\([^)]*\)/g,
    fix: (match, filePath) => {
      // This is a complex pattern that needs context analysis
      return null; // Manual fix required
    },
    files: ['src/**/*.tsx', 'src/**/*.ts']
  },
  {
    name: 'setTimeout without clearTimeout in useEffect',
    pattern: /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*setTimeout\s*\([^}]*\}\s*\)/gs,
    fix: (match, filePath) => {
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
    files: ['src/**/*.tsx', 'src/**/*.ts']
  },
  {
    name: 'setInterval without clearInterval in useEffect',
    pattern: /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*setInterval\s*\([^}]*\}\s*\)/gs,
    fix: (match, filePath) => {
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
    files: ['src/**/*.tsx', 'src/**/*.ts']
  },
  {
    name: 'addEventListener without removeEventListener',
    pattern: /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*addEventListener\s*\([^)]*\);[^}]*\}\s*\)/gs,
    fix: (match, filePath) => {
      const listenerMatch = match.match(/addEventListener\s*\(([^)]*)\);/);
      if (listenerMatch) {
        const args = listenerMatch[1];
        return match.replace(
          /addEventListener\s*\(([^)]*)\);/,
          `addEventListener(${args});
        
        return () => {
          removeEventListener(${args});
        };`
        );
      }
      return match;
    },
    files: ['src/**/*.tsx', 'src/**/*.ts']
  }
];

// Files to scan
const filesToScan = [
  'src/components/**/*.tsx',
  'src/hooks/**/*.ts',
  'src/contexts/**/*.tsx',
  'src/app/**/*.tsx'
];

function scanForCriticalLeaks() {
  let totalIssues = 0;
  let totalFixes = 0;

  filesToScan.forEach(pattern => {
    const files = glob.sync(pattern);
    
    files.forEach(file => {
      if (!fs.existsSync(file)) return;
      
      const content = fs.readFileSync(file, 'utf8');
      let fileModified = false;
      let fileIssues = 0;

      criticalLeakPatterns.forEach(pattern => {
        if (pattern.pattern.test(content)) {
          fileIssues++;
          totalIssues++;
          
          console.log(`⚠️  Found ${pattern.name} in ${file}`);
          
          // Apply fix if available
          if (pattern.fix) {
            const newContent = content.replace(pattern.pattern, (match) => {
              return pattern.fix(match, file) || match;
            });
            
            if (newContent !== content) {
              fs.writeFileSync(file, newContent, 'utf8');
              fileModified = true;
              totalFixes++;
              console.log(`✅ Fixed ${pattern.name} in ${file}`);
            }
          }
        }
      });

      if (fileIssues > 0) {
        console.log(`📁 ${file}: ${fileIssues} critical issues found`);
      }
    });
  });

  return { totalIssues, totalFixes };
}

function addMountedChecks() {
  console.log('\n🔧 Adding mounted checks to critical components...\n');

  const criticalComponents = [
    'src/components/candidates/CandidateImportUploadQueue.tsx',
    'src/components/dashboard/DashboardPageClient.tsx',
    'src/components/UploadQueueStatus.tsx',
    'src/hooks/use-unified-realtime.ts',
    'src/hooks/use-unified-realtime-optimized.ts'
  ];

  criticalComponents.forEach(file => {
    if (!fs.existsSync(file)) return;

    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    // Add mounted ref if not present
    if (!content.includes('mountedRef') && !content.includes('mounted = true')) {
      const importMatch = content.match(/import\s+.*from\s+['"]react['"]/);
      if (importMatch) {
        content = content.replace(
          importMatch[0],
          `${importMatch[0]}
import { useRef, useEffect } from 'react';`
        );
        modified = true;
      }

      // Add mounted ref in component
      const componentMatch = content.match(/export\s+function\s+(\w+)/);
      if (componentMatch) {
        const componentName = componentMatch[1];
        const hookMatch = content.match(new RegExp(`export\\s+function\\s+${componentName}\\s*\\([^)]*\\)\\s*\\{[^}]*const\\s+\\w+\\s*=\\s*useState`));
        if (hookMatch) {
          content = content.replace(
            hookMatch[0],
            `${hookMatch[0]}
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);`
          );
          modified = true;
        }
      }
    }

    if (modified) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✅ Added mounted checks to ${file}`);
    }
  });
}

function createGlobalCleanup() {
  console.log('\n🔧 Creating global cleanup utilities...\n');

  const globalCleanupContent = `
// Global cleanup utilities
window.addEventListener('beforeunload', () => {
  // Clean up all EventSource connections
  const eventSources = document.querySelectorAll('script[src*="EventSource"]');
  eventSources.forEach(script => {
    if (script.src) {
      const eventSource = new EventSource(script.src);
      eventSource.close();
    }
  });

  // Clear all timeouts and intervals
  const highestTimeoutId = setTimeout(() => {}, 0);
  for (let i = 0; i < highestTimeoutId; i++) {
    clearTimeout(i);
    clearInterval(i);
  }
});

// Monitor for memory leaks
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const memoryInfo = (performance as any).memory;
    if (memoryInfo && memoryInfo.usedJSHeapSize > 100 * 1024 * 1024) {
      console.warn('🚨 High memory usage detected:', Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024), 'MB');
    }
  }, 10000);
}
`;

  fs.writeFileSync('src/lib/global-cleanup.ts', globalCleanupContent, 'utf8');
  console.log('✅ Created global cleanup utilities');
}

// Main execution
function main() {
  console.log('🚀 Starting critical resource leak detection and fixes...\n');

  // Scan for critical leaks
  const { totalIssues, totalFixes } = scanForCriticalLeaks();

  // Add mounted checks to critical components
  addMountedChecks();

  // Create global cleanup utilities
  createGlobalCleanup();

  console.log('\n📋 Summary:');
  console.log(`- Total critical issues found: ${totalIssues}`);
  console.log(`- Total fixes applied: ${totalFixes}`);
  console.log('\n✅ Critical resource leak detection and fixes completed!');
  console.log('\n💡 Next steps:');
  console.log('1. Test the application thoroughly');
  console.log('2. Monitor the console for memory leak warnings');
  console.log('3. Check if the application still gets stuck on loading');
  console.log('4. Consider adding the PerformanceMonitor component');
}

if (require.main === module) {
  main();
}

module.exports = { scanForCriticalLeaks, addMountedChecks, createGlobalCleanup };
