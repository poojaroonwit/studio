#!/usr/bin/env node

/**
 * Real-time Memory Leak Fix Script
 * Fixes critical memory leaks in real-time features
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Real-time Memory Leaks...\n');

// Critical real-time files to fix
const realtimeFixes = [
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
            reconnectTimeout = null;
          }
        };`
      },
      {
        pattern: /reconnectTimeout = setTimeout\(\(\) => \{/,
        replacement: `reconnectTimeout = setTimeout(() => {
          reconnectTimeout = null;`
      },
      {
        pattern: /return \(\) => \{/,
        replacement: `return () => {
          cleanup();
          if (eventSource) {
            eventSource.close();
            setEventSource(null);
          }`
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
            refreshTimeout = null;
          }
        };`
      }
    ]
  },
  {
    file: 'src/hooks/use-realtime-collaboration.ts',
    fixes: [
      {
        pattern: /healthCheckIntervalRef\.current = setInterval\(\(\) => \{/,
        replacement: `healthCheckIntervalRef.current = setInterval(() => {`
      },
      {
        pattern: /return \{/,
        replacement: `// Cleanup function
  const cleanup = () => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  return {`
      }
    ]
  },
  {
    file: 'src/hooks/use-unified-realtime.ts',
    fixes: [
      {
        pattern: /healthCheckIntervalRef\.current = setInterval\(\(\) => \{/,
        replacement: `healthCheckIntervalRef.current = setInterval(() => {`
      },
      {
        pattern: /const healthInterval = setInterval\(updateConnectionHealth, 10000\);/,
        replacement: `const healthInterval = setInterval(updateConnectionHealth, 10000);
        
        return () => {
          clearInterval(healthInterval);
        };`
      },
      {
        pattern: /return cleanupConnection;/,
        replacement: `// Enhanced cleanup
  const enhancedCleanup = () => {
    cleanupConnection();
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };
  
  return enhancedCleanup;`
      }
    ]
  },
  {
    file: 'src/components/layout/SidebarNav.tsx',
    fixes: [
      {
        pattern: /eventSource = new EventSource\("\/api\/upload-queue\/sse"\);/,
        replacement: `eventSource = new EventSource("/api/upload-queue/sse");
        
        // Cleanup function
        const cleanup = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
          }
        };`
      },
      {
        pattern: /pollingInterval = setInterval\(\(\) => \{/,
        replacement: `pollingInterval = setInterval(() => {`
      },
      {
        pattern: /return \(\) => \{/,
        replacement: `return () => {
          cleanup();
          ignore = true;`
      }
    ]
  }
];

function applyRealtimeFixes() {
  let totalFixes = 0;
  
  realtimeFixes.forEach(({ file, fixes }) => {
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

// Create environment optimization script
const envOptimization = `
# Real-time Optimization Settings
# Add these to your .env.local or .env.production

# Reduce real-time update frequency
REALTIME_KEEPALIVE_INTERVAL=30000
REALTIME_HEALTH_CHECK_INTERVAL=60000
REALTIME_PRESENCE_UPDATE_INTERVAL=60000

# Limit concurrent connections
MAX_SSE_CONNECTIONS_PER_USER=3
SSE_CONNECTION_TIMEOUT=300000

# Database connection optimization
DATABASE_MAX_CONNECTIONS=20
DATABASE_IDLE_TIMEOUT=60000
DATABASE_STATEMENT_TIMEOUT=45000

# Memory management
NODE_OPTIONS="--max-old-space-size=4096 --gc-interval=100"
`;

fs.writeFileSync('scripts/realtime-optimization.env', envOptimization);
console.log('📄 Created real-time optimization settings: scripts/realtime-optimization.env');

// Apply the fixes
const fixesApplied = applyRealtimeFixes();
console.log(`\n🎉 Applied ${fixesApplied} real-time memory leak fixes!`);

console.log('\n🚀 Next Steps:');
console.log('1. Add the optimization settings to your .env file');
console.log('2. Restart your application');
console.log('3. Monitor memory usage - should be significantly reduced');
console.log('4. Consider implementing connection pooling for SSE');
console.log('5. Test with multiple users to ensure stability');

console.log('\n⚠️  Additional Recommendations:');
console.log('- Consider consolidating multiple SSE endpoints into one unified endpoint');
console.log('- Implement connection limits per user');
console.log('- Add circuit breakers for real-time features');
console.log('- Monitor real-time connection count in production');
