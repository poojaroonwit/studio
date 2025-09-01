#!/usr/bin/env node

/**
 * Migration Script: Replace Complex SSE Hooks with Simple Ones
 * 
 * This script will:
 * 1. Replace useUnifiedRealtime with useSimpleSSE or specialized hooks
 * 2. Update imports
 * 3. Simplify the hook usage
 */

const fs = require('fs');
const path = require('path');

// Files that need migration
const filesToMigrate = [
  'src/components/UploadQueueStatus.tsx',
  'src/components/candidates/CandidatesPageClient.tsx',
  'src/components/dashboard/DashboardPageClient.tsx',
  'src/components/positions/PositionsPageClient.tsx',
  'src/components/candidates/CandidateImportUploadQueue.tsx',
  'src/components/tasks/MyTasksPageClient.tsx',
  'src/components/ui/realtime-collaboration.tsx',
  'src/components/ui/user-presence-indicator.tsx',
  'src/components/ui/breadcrumb.tsx',
  'src/components/candidates/hooks/useCandidateDetail.ts',
  'src/contexts/WarningContext.tsx',
  'src/contexts/NotificationContext.tsx',
  'src/hooks/use-realtime-collaboration.ts',
  'src/hooks/use-upload-queue-sse.ts'
];

// Migration patterns
const migrations = [
  // Replace imports
  {
    pattern: /import\s+\{\s*useUnifiedRealtime\s*\}\s+from\s+['"]@\/hooks\/use-unified-realtime['"];?/g,
    replacement: `import { useSimpleSSE, useCandidateUpdates, usePositionUpdates, useNotifications, useUploadQueueUpdates } from '@/hooks/use-simple-sse';`
  },
  {
    pattern: /import\s+\{\s*useUnifiedRealtime\s*\}\s+from\s+['"]@\/hooks\/use-unified-realtime-optimized['"];?/g,
    replacement: `import { useSimpleSSE, useCandidateUpdates, usePositionUpdates, useNotifications, useUploadQueueUpdates } from '@/hooks/use-simple-sse';`
  },
  
  // Replace complex hook usage with simple ones
  {
    pattern: /const\s+\{\s*isConnected:\s*isRealtimeActive,\s*lastUpdate:\s*realtimeLastUpdate\s*\}\s*=\s*useUnifiedRealtime\(\{\s*onUploadQueueUpdate:\s*\(queueData:\s*any\)\s*=>\s*\{[^}]*\}\s*\}\);/g,
    replacement: `const { isConnected: isRealtimeActive, lastMessage } = useUploadQueueUpdates();`
  },
  
  // Replace candidate updates
  {
    pattern: /const\s+\{\s*isConnected:\s*realtimeConnected\s*\}\s*=\s*useUnifiedRealtime\(\{\s*onCandidateUpdate:\s*handleCandidateUpdate,\s*onPositionUpdate:\s*handlePositionUpdate,\s*onPresenceUpdate:\s*handlePresenceUpdate,\s*onUserListUpdate:\s*handleUserListUpdate,\s*onNotificationUpdate:\s*handleNotificationUpdate,\s*showNotifications:\s*true,\s*showErrorNotifications:\s*false,\s*\}\);/g,
    replacement: `const { isConnected: realtimeConnected } = useSimpleSSE();`
  },
  
  // Replace simple connection checks
  {
    pattern: /const\s+\{\s*isConnected\s*\}\s*=\s*useUnifiedRealtime\(\{\s*\}\);/g,
    replacement: `const { isConnected } = useSimpleSSE();`
  },
  
  // Replace with connection and reconnection
  {
    pattern: /const\s+\{\s*isConnected,\s*isReconnecting,\s*reconnectAttempts\s*\}\s*=\s*useUnifiedRealtime\(\{\s*\}\);/g,
    replacement: `const { isConnected, error, reconnect } = useSimpleSSE();`
  },
  
  // Replace with connection and last update
  {
    pattern: /const\s+\{\s*isConnected,\s*lastUpdate\s*\}\s*=\s*useUnifiedRealtime\(\{\s*\}\);/g,
    replacement: `const { isConnected, lastMessage } = useSimpleSSE();`
  },
  
  // Replace with connection, reconnect, disconnect
  {
    pattern: /const\s+\{\s*isConnected,\s*lastUpdate,\s*reconnect,\s*disconnect\s*\}\s*=\s*useUnifiedRealtime\(\{\s*\}\);/g,
    replacement: `const { isConnected, lastMessage, reconnect, disconnect } = useSimpleSSE();`
  }
];

function migrateFile(filePath) {
  console.log(`Migrating: ${filePath}`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Apply migrations
    migrations.forEach(migration => {
      content = content.replace(migration.pattern, migration.replacement);
    });
    
    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error migrating ${filePath}:`, error.message);
  }
}

function main() {
  console.log('🚀 Starting SSE Migration...\n');
  
  filesToMigrate.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      migrateFile(filePath);
    } else {
      console.log(`⚠️  File not found: ${filePath}`);
    }
  });
  
  console.log('\n✅ Migration completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Test the application to ensure everything works');
  console.log('2. Remove old complex SSE files if no longer needed');
  console.log('3. Update any remaining references manually');
}

if (require.main === module) {
  main();
}

module.exports = { migrateFile, migrations };
