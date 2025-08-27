#!/usr/bin/env node

/**
 * Resource Leak Detection and Fix Script
 * 
 * This script automatically detects and fixes common resource leak patterns
 * that cause the application to get stuck on loading.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔍 Scanning for resource leaks...\n');

// Patterns to detect and fix
const leakPatterns = [
  {
    name: 'setTimeout without clearTimeout in useEffect',
    pattern: /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*setTimeout\s*\(\s*\(\)\s*=>\s*\{[^}]*\}\s*,\s*\d+\s*\)[^}]*\}\s*\)/gs,
    fix: (match) => {
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
    pattern: /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*setInterval\s*\(\s*\(\)\s*=>\s*\{[^}]*\}\s*,\s*\d+\s*\)[^}]*\}\s*\)/gs,
    fix: (match) => {
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
    name: 'EventSource without close in useEffect',
    pattern: /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*const\s+(\w+)\s*=\s*new\s+EventSource\s*\([^)]*\);[^}]*\}\s*\)/gs,
    fix: (match) => {
      const eventSourceMatch = match.match(/const\s+(\w+)\s*=\s*new\s+EventSource\s*\([^)]*\);/);
      if (eventSourceMatch) {
        const varName = eventSourceMatch[1];
        return match.replace(
          /const\s+(\w+)\s*=\s*new\s+EventSource\s*\([^)]*\);/,
          `const ${varName} = new EventSource(${varName}Url);
        
        return () => {
          if (${varName}) {
            ${varName}.close();
          }
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
    fix: (match) => {
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
  },
  {
    name: 'State updates without mounted check',
    pattern: /setState\s*\([^)]*\)/g,
    fix: (match) => {
      // This is a complex pattern that needs context
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

function scanForLeaks() {
  let totalIssues = 0;
  let totalFixes = 0;

  filesToScan.forEach(pattern => {
    const files = glob.sync(pattern);
    
    files.forEach(file => {
      if (!fs.existsSync(file)) return;
      
      const content = fs.readFileSync(file, 'utf8');
      let fileModified = false;
      let fileIssues = 0;

      leakPatterns.forEach(pattern => {
        if (pattern.pattern.test(content)) {
          fileIssues++;
          totalIssues++;
          
          console.log(`⚠️  Found ${pattern.name} in ${file}`);
          
          // Apply fix if available
          if (pattern.fix) {
            const newContent = content.replace(pattern.pattern, pattern.fix);
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
        console.log(`📁 ${file}: ${fileIssues} issues found`);
      }
    });
  });

  return { totalIssues, totalFixes };
}

function addResourceTracking() {
  console.log('\n🔧 Adding resource tracking to components...\n');

  const componentsToUpdate = [
    'src/components/candidates/CandidatesPageClient.tsx',
    'src/components/candidates/CandidateImportUploadQueue.tsx',
    'src/contexts/WarningContext.tsx',
    'src/contexts/NotificationContext.tsx'
  ];

  componentsToUpdate.forEach(file => {
    if (!fs.existsSync(file)) return;

    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    // Add import for resource tracking
    if (!content.includes('useResourceCleanup') && !content.includes('@/lib/resource-leak-fixes')) {
      const importMatch = content.match(/import\s+.*from\s+['"]react['"]/);
      if (importMatch) {
        content = content.replace(
          importMatch[0],
          `${importMatch[0]}
import { useResourceCleanup, useSafeTimeout, useSafeInterval, useSafeEventSource } from '@/lib/resource-leak-fixes';`
        );
        modified = true;
      }
    }

    // Add resource cleanup hook
    if (!content.includes('useResourceCleanup()')) {
      const componentMatch = content.match(/export\s+function\s+(\w+)/);
      if (componentMatch) {
        const componentName = componentMatch[1];
        const hookMatch = content.match(new RegExp(`export\\s+function\\s+${componentName}\\s*\\([^)]*\\)\\s*\\{[^}]*const\\s+\\w+\\s*=\\s*useState`));
        if (hookMatch) {
          content = content.replace(
            hookMatch[0],
            `${hookMatch[0]}
  const registerCleanup = useResourceCleanup();
  const { setTimeout, clearTimeout } = useSafeTimeout();
  const { setInterval, clearInterval } = useSafeInterval();
  const { createEventSource, closeEventSource } = useSafeEventSource();`
          );
          modified = true;
        }
      }
    }

    if (modified) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✅ Updated ${file} with resource tracking`);
    }
  });
}

function createPerformanceMonitor() {
  console.log('\n📊 Creating performance monitoring component...\n');

  const monitorContent = `"use client";

import { useEffect } from 'react';
import { usePerformanceMonitor, detectMemoryLeaks } from '@/lib/resource-leak-fixes';

export function PerformanceMonitor() {
  const metrics = usePerformanceMonitor(process.env.NODE_ENV === 'development');

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        const leaks = detectMemoryLeaks();
        if (leaks.length > 0) {
          console.warn('🚨 Memory leaks detected:', leaks);
        }
      }, 10000);

      return () => clearInterval(interval);
    }
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs z-50">
      <div>Memory: {metrics.memoryUsage}MB</div>
      <div>Resources: {metrics.resourceCount}</div>
    </div>
  );
}
`;

  fs.writeFileSync('src/components/PerformanceMonitor.tsx', monitorContent, 'utf8');
  console.log('✅ Created PerformanceMonitor component');
}

// Main execution
function main() {
  console.log('🚀 Starting resource leak detection and fixes...\n');

  // Scan for existing leaks
  const { totalIssues, totalFixes } = scanForLeaks();

  // Add resource tracking to components
  addResourceTracking();

  // Create performance monitor
  createPerformanceMonitor();

  console.log('\n📋 Summary:');
  console.log(`- Total issues found: ${totalIssues}`);
  console.log(`- Total fixes applied: ${totalFixes}`);
  console.log('\n✅ Resource leak detection and fixes completed!');
  console.log('\n💡 Next steps:');
  console.log('1. Review the changes made to ensure they are correct');
  console.log('2. Test the application to ensure no regressions');
  console.log('3. Monitor the console for any remaining resource leaks');
  console.log('4. Consider adding the PerformanceMonitor component to your layout');
}

if (require.main === module) {
  main();
}

module.exports = { scanForLeaks, addResourceTracking, createPerformanceMonitor };
