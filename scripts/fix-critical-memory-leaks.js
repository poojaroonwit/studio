#!/usr/bin/env node

/**
 * Critical Memory Leak Fix Script
 * Automatically fixes the most critical memory leaks in the codebase
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Critical Memory Leaks...\n');

// Critical files to fix
const criticalFiles = [
  {
    file: 'src/contexts/NotificationContext.tsx',
    fixes: [
      {
        pattern: /const es = new EventSource\('\/api\/candidates\/sse'\);/,
        replacement: `const es = new EventSource('/api/candidates/sse');
        
        // Cleanup function
        const cleanup = () => {
          if (es) {
            es.close();
          }
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
          }
        };`
      },
      {
        pattern: /reconnectTimeout = setTimeout\(\(\) => \{/,
        replacement: `reconnectTimeout = setTimeout(() => {
          // Clear the timeout reference
          reconnectTimeout = null;`
      }
    ]
  },
  {
    file: 'src/contexts/WarningContext.tsx',
    fixes: [
      {
        pattern: /const refreshTimeout = setTimeout\(\(\) => fetchWarnings\(\), 2000\);/,
        replacement: `const refreshTimeout = setTimeout(() => {
          fetchWarnings();
          refreshTimeout = null;
        }, 2000);`
      },
      {
        pattern: /const eventSource = new EventSource\('\/api\/warnings\/stream'\);/,
        replacement: `const eventSource = new EventSource('/api/warnings/stream');
        
        // Cleanup function
        const cleanup = () => {
          if (eventSource) {
            eventSource.close();
          }
          if (refreshTimeout) {
            clearTimeout(refreshTimeout);
          }
        };`
      }
    ]
  },
  {
    file: 'src/hooks/use-realtime-collaboration.ts',
    fixes: [
      {
        pattern: /const keepaliveInterval = setInterval\(\(\) => \{/,
        replacement: `const keepaliveInterval = setInterval(() => {`
      },
      {
        pattern: /const healthCheckInterval = setInterval\(\(\) => \{/,
        replacement: `const healthCheckInterval = setInterval(() => {`
      },
      {
        pattern: /return \{/,
        replacement: `// Cleanup function
  const cleanup = () => {
    if (keepaliveInterval) {
      clearInterval(keepaliveInterval);
    }
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
    }
    if (eventSource) {
      eventSource.close();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  return {`
      }
    ]
  }
];

function applyFixes() {
  let totalFixes = 0;
  
  criticalFiles.forEach(({ file, fixes }) => {
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
console.log(`\n🎉 Applied ${fixesApplied} critical memory leak fixes!`);

// Create a database optimization script
const dbOptimizationScript = `
-- Database Connection Pool Optimization
-- Run this in your database to improve performance

-- Increase max connections for high load
ALTER SYSTEM SET max_connections = 100;

-- Optimize connection pool settings
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';

-- Restart database to apply changes
-- sudo systemctl restart postgresql

-- Monitor connections
SELECT 
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active_connections,
  count(*) FILTER (WHERE state = 'idle') as idle_connections
FROM pg_stat_activity;
`;

fs.writeFileSync('scripts/optimize-database-connections.sql', dbOptimizationScript);
console.log('📄 Created database optimization script: scripts/optimize-database-connections.sql');

console.log('\n🚀 Next Steps:');
console.log('1. Restart your application');
console.log('2. Monitor memory usage with browser DevTools');
console.log('3. Run the database optimization script');
console.log('4. Consider increasing Docker memory limits');
