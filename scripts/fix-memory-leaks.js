#!/usr/bin/env node

/**
 * Memory Leak Detection and Fix Script
 * 
 * This script helps identify and fix common memory leaks in the application.
 * Run this script when the application is experiencing high memory usage.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Memory Leak Detection and Fix Script');
console.log('=====================================\n');

// Common memory leak patterns to check
const memoryLeakPatterns = [
  {
    name: 'setTimeout without clearTimeout',
    pattern: /setTimeout\s*\([^)]*\)(?!\s*;?\s*\/\/\s*clearTimeout)/g,
    severity: 'high',
    fix: 'Add clearTimeout in useEffect cleanup'
  },
  {
    name: 'setInterval without clearInterval',
    pattern: /setInterval\s*\([^)]*\)(?!\s*;?\s*\/\/\s*clearInterval)/g,
    severity: 'high',
    fix: 'Add clearInterval in useEffect cleanup'
  },
  {
    name: 'addEventListener without removeEventListener',
    pattern: /addEventListener\s*\([^)]*\)(?!\s*;?\s*\/\/\s*removeEventListener)/g,
    severity: 'medium',
    fix: 'Add removeEventListener in useEffect cleanup'
  },
  {
    name: 'EventSource without close',
    pattern: /new\s+EventSource\s*\([^)]*\)(?!\s*;?\s*\/\/\s*close)/g,
    severity: 'high',
    fix: 'Add eventSource.close() in useEffect cleanup'
  },
  {
    name: 'ResizeObserver without disconnect',
    pattern: /new\s+ResizeObserver\s*\([^)]*\)(?!\s*;?\s*\/\/\s*disconnect)/g,
    severity: 'medium',
    fix: 'Add observer.disconnect() in useEffect cleanup'
  },
  {
    name: 'useEffect without cleanup',
    pattern: /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*\}\s*\)(?!\s*,\s*\[\])/g,
    severity: 'medium',
    fix: 'Add cleanup function to useEffect'
  },
  {
    name: 'Large object creation in render',
    pattern: /const\s+\w+\s*=\s*\{[^}]{500,}\}/g,
    severity: 'low',
    fix: 'Move large objects outside component or use useMemo'
  },
  {
    name: 'Inline function in render',
    pattern: /onClick\s*=\s*\{[^}]*=>[^}]*\}/g,
    severity: 'low',
    fix: 'Use useCallback for event handlers'
  }
];

// Directories to scan
const scanDirectories = [
  'src/components',
  'src/hooks',
  'src/app',
  'src/contexts'
];

// File extensions to scan
const fileExtensions = ['.tsx', '.ts', '.jsx', '.js'];

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    
    memoryLeakPatterns.forEach(pattern => {
      const matches = content.match(pattern.pattern);
      if (matches) {
        const lines = content.split('\n');
        matches.forEach(match => {
          const lineIndex = lines.findIndex(line => line.includes(match));
          if (lineIndex !== -1) {
            issues.push({
              pattern: pattern.name,
              severity: pattern.severity,
              line: lineIndex + 1,
              code: lines[lineIndex].trim(),
              fix: pattern.fix,
              file: filePath
            });
          }
        });
      }
    });
    
    return issues;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return [];
  }
}

function scanDirectory(dirPath) {
  const issues = [];
  
  try {
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        issues.push(...scanDirectory(fullPath));
      } else if (fileExtensions.includes(path.extname(item))) {
        issues.push(...scanFile(fullPath));
      }
    });
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error.message);
  }
  
  return issues;
}

function generateReport(issues) {
  console.log(`📊 Found ${issues.length} potential memory leak issues:\n`);
  
  const severityCounts = {
    high: 0,
    medium: 0,
    low: 0
  };
  
  issues.forEach(issue => {
    severityCounts[issue.severity]++;
  });
  
  console.log('Severity Breakdown:');
  console.log(`  🔴 High: ${severityCounts.high}`);
  console.log(`  🟡 Medium: ${severityCounts.medium}`);
  console.log(`  🟢 Low: ${severityCounts.low}\n`);
  
  // Group by file
  const issuesByFile = {};
  issues.forEach(issue => {
    if (!issuesByFile[issue.file]) {
      issuesByFile[issue.file] = [];
    }
    issuesByFile[issue.file].push(issue);
  });
  
  Object.keys(issuesByFile).forEach(file => {
    console.log(`📁 ${file}:`);
    issuesByFile[file].forEach(issue => {
      const severityIcon = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
      console.log(`  ${severityIcon} Line ${issue.line}: ${issue.pattern}`);
      console.log(`     Code: ${issue.code}`);
      console.log(`     Fix: ${issue.fix}\n`);
    });
  });
}

function generateFixScript(issues) {
  const highPriorityIssues = issues.filter(issue => issue.severity === 'high');
  
  if (highPriorityIssues.length === 0) {
    console.log('✅ No high-priority memory leaks found!');
    return;
  }
  
  console.log('🔧 Generating fix suggestions for high-priority issues:\n');
  
  highPriorityIssues.forEach(issue => {
    console.log(`File: ${issue.file}`);
    console.log(`Line: ${issue.line}`);
    console.log(`Issue: ${issue.pattern}`);
    console.log(`Suggested Fix: ${issue.fix}`);
    console.log('---\n');
  });
}

function checkPackageJson() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    console.log('📦 Package.json Analysis:');
    
    // Check for memory-related dependencies
    const memoryDeps = ['memory-leak-detector', 'heap-profile', 'v8-profiler'];
    const foundDeps = memoryDeps.filter(dep => packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]);
    
    if (foundDeps.length > 0) {
      console.log(`  ✅ Memory monitoring dependencies found: ${foundDeps.join(', ')}`);
    } else {
      console.log('  ⚠️  No memory monitoring dependencies found');
      console.log('  💡 Consider adding: memory-leak-detector, heap-profile');
    }
    
    // Check for performance-related scripts
    const scripts = packageJson.scripts || {};
    const performanceScripts = Object.keys(scripts).filter(script => 
      script.includes('memory') || script.includes('performance') || script.includes('profile')
    );
    
    if (performanceScripts.length > 0) {
      console.log(`  ✅ Performance scripts found: ${performanceScripts.join(', ')}`);
    } else {
      console.log('  ⚠️  No performance monitoring scripts found');
    }
    
    console.log('');
  } catch (error) {
    console.error('Error reading package.json:', error.message);
  }
}

function generateOptimizationTips() {
  console.log('💡 Memory Optimization Tips:\n');
  
  const tips = [
    '1. Use React.memo() for expensive components',
    '2. Implement proper cleanup in useEffect hooks',
    '3. Use useCallback for event handlers',
    '4. Use useMemo for expensive calculations',
    '5. Avoid creating objects in render functions',
    '6. Implement proper error boundaries',
    '7. Use React.lazy() for code splitting',
    '8. Monitor bundle size with webpack-bundle-analyzer',
    '9. Implement proper loading states',
    '10. Use React DevTools Profiler for performance analysis'
  ];
  
  tips.forEach(tip => console.log(tip));
  console.log('');
}

// Main execution
function main() {
  console.log('Starting memory leak detection...\n');
  
  // Check package.json
  checkPackageJson();
  
  // Scan for issues
  let allIssues = [];
  scanDirectories.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`Scanning ${dir}...`);
      allIssues.push(...scanDirectory(dir));
    } else {
      console.log(`Directory ${dir} not found, skipping...`);
    }
  });
  
  // Generate report
  generateReport(allIssues);
  
  // Generate fix suggestions
  generateFixScript(allIssues);
  
  // Generate optimization tips
  generateOptimizationTips();
  
  // Summary
  const highPriorityCount = allIssues.filter(issue => issue.severity === 'high').length;
  
  if (highPriorityCount > 0) {
    console.log(`⚠️  Found ${highPriorityCount} high-priority memory leak issues that should be addressed immediately.`);
  } else {
    console.log('✅ No high-priority memory leak issues found!');
  }
  
  console.log('\n🎯 Next steps:');
  console.log('1. Review the high-priority issues above');
  console.log('2. Implement the suggested fixes');
  console.log('3. Test the application for memory usage');
  console.log('4. Use browser DevTools Memory tab for detailed analysis');
  console.log('5. Consider implementing the MemoryLeakFix component');
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  scanFile,
  scanDirectory,
  generateReport,
  generateFixScript,
  memoryLeakPatterns
};
