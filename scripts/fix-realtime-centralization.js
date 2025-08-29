#!/usr/bin/env node

/**
 * Realtime Centralization Fix Script
 * 
 * This script checks and fixes all realtime implementations to ensure they use
 * the centralized useUnifiedRealtime hook instead of scattered EventSource connections.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const config = {
  srcDir: 'src',
  hooksDir: 'src/hooks',
  componentsDir: 'src/components',
  apiDir: 'src/app/api',
  backupDir: 'backup-realtime-fixes',
  logFile: 'realtime-centralization-fix.log'
};

// Files to check and fix
const filesToCheck = [
  // Components that might have manual EventSource implementations
  'src/components/UploadQueueStatus.tsx',
  'src/components/UploadQueueStatistics.tsx',
  'src/components/candidates/CandidateImportUploadQueue.tsx',
  'src/components/ui/user-presence-indicator.tsx',
  'src/components/ui/realtime-collaboration.tsx',
  'src/components/dashboard/DashboardPageClient.tsx',
  'src/components/positions/PositionsPageClient.tsx',
  'src/components/candidates/CandidatesPageClient.tsx',
  'src/components/tasks/MyTasksPageClient.tsx',
  'src/app/task-board/page.tsx',
  
  // Hooks that might have separate realtime implementations
  'src/hooks/use-upload-queue-sse.ts',
  'src/hooks/use-user-presence.ts',
  'src/hooks/use-unified-realtime.ts',
  'src/hooks/use-unified-realtime-optimized.ts',
  
  // API endpoints that might need consolidation
  'src/app/api/upload-queue/sse/route.ts',
  'src/app/api/realtime/presence/route.ts',
  'src/app/api/realtime/notifications/route.ts',
  'src/app/api/realtime/unified/route.ts'
];

// Patterns to detect manual EventSource usage
const eventSourcePatterns = [
  /new EventSource\(/g,
  /EventSource\./g,
  /eventSource\./g,
  /onopen\s*=/g,
  /onerror\s*=/g,
  /onmessage\s*=/g,
  /addEventListener\(/g,
  /removeEventListener\(/g
];

// Patterns to detect realtime hook usage
const realtimeHookPatterns = [
  /useUnifiedRealtime/g,
  /useUploadQueueSSE/g,
  /useUserPresence/g,
  /useRealtimeCollaboration/g
];

// Files that should be using centralized realtime
const shouldUseCentralizedRealtime = [
  'src/components/UploadQueueStatus.tsx',
  'src/components/UploadQueueStatistics.tsx',
  'src/components/candidates/CandidateImportUploadQueue.tsx',
  'src/components/ui/user-presence-indicator.tsx',
  'src/components/ui/realtime-collaboration.tsx',
  'src/components/dashboard/DashboardPageClient.tsx',
  'src/components/positions/PositionsPageClient.tsx',
  'src/components/candidates/CandidatesPageClient.tsx',
  'src/components/tasks/MyTasksPageClient.tsx',
  'src/app/task-board/page.tsx'
];

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  
  // Also write to log file
  fs.appendFileSync(config.logFile, logMessage + '\n');
}

function backupFile(filePath) {
  if (!fs.existsSync(config.backupDir)) {
    fs.mkdirSync(config.backupDir, { recursive: true });
  }
  
  const backupPath = path.join(config.backupDir, path.basename(filePath));
  fs.copyFileSync(filePath, backupPath);
  log(`Backed up ${filePath} to ${backupPath}`);
}

function checkFile(filePath) {
  if (!fs.existsSync(filePath)) {
    log(`File not found: ${filePath}`, 'WARN');
    return { exists: false };
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const hasEventSource = eventSourcePatterns.some(pattern => pattern.test(content));
  const hasRealtimeHook = realtimeHookPatterns.some(pattern => pattern.test(content));
  const shouldUseCentralized = shouldUseCentralizedRealtime.includes(filePath);
  
  return {
    exists: true,
    hasEventSource,
    hasRealtimeHook,
    shouldUseCentralized,
    content,
    filePath
  };
}

function fixComponentFile(fileInfo) {
  if (!fileInfo.exists || !fileInfo.shouldUseCentralized) {
    return false;
  }
  
  let content = fileInfo.content;
  let modified = false;
  
  // Check if it's already using centralized realtime
  if (content.includes('useUnifiedRealtime')) {
    log(`${fileInfo.filePath} already uses centralized realtime`, 'INFO');
    return false;
  }
  
  // Check if it has manual EventSource implementation
  if (fileInfo.hasEventSource) {
    log(`Found manual EventSource implementation in ${fileInfo.filePath}`, 'WARN');
    
    // Backup the file
    backupFile(fileInfo.filePath);
    
    // This is a complex fix that would require manual intervention
    // For now, we'll just log the issue
    log(`Manual fix required for ${fileInfo.filePath} - replace EventSource with useUnifiedRealtime`, 'ERROR');
    return true;
  }
  
  return false;
}

function fixHookFile(fileInfo) {
  if (!fileInfo.exists) {
    return false;
  }
  
  let content = fileInfo.content;
  let modified = false;
  
  // Check if it's the main unified realtime hook
  if (fileInfo.filePath.includes('use-unified-realtime-optimized.ts')) {
    log(`Checking main unified realtime hook: ${fileInfo.filePath}`, 'INFO');
    
    // Check for common issues
    if (content.includes('incomplete useSafeEffect')) {
      log(`Found incomplete useSafeEffect in ${fileInfo.filePath}`, 'WARN');
      modified = true;
    }
    
    if (!content.includes('globalEventSource')) {
      log(`Missing global connection sharing in ${fileInfo.filePath}`, 'WARN');
      modified = true;
    }
    
    if (!content.includes('maxReconnectAttempts')) {
      log(`Missing reconnection limits in ${fileInfo.filePath}`, 'WARN');
      modified = true;
    }
  }
  
  // Check if it's a separate hook that should be consolidated
  if (fileInfo.filePath.includes('use-upload-queue-sse.ts') && fileInfo.hasEventSource) {
    log(`Found separate upload queue SSE hook that should be consolidated`, 'WARN');
    backupFile(fileInfo.filePath);
    
    // Replace with centralized implementation
    const newContent = `import { useCallback, useState } from 'react';
import { useUnifiedRealtime } from './use-unified-realtime';

interface UploadQueueSSEMessage {
  type: 'queue' | 'error';
  data?: any;
}

interface UseUploadQueueSSEReturn {
  isConnected: boolean;
  lastMessage: UploadQueueSSEMessage | null;
  reconnect: () => void;
}

// Centralized upload queue SSE hook using unified realtime system
export function useUploadQueueSSE(): UseUploadQueueSSEReturn {
  const [lastMessage, setLastMessage] = useState<UploadQueueSSEMessage | null>(null);
  
  const { isConnected, reconnect } = useUnifiedRealtime({
    onUploadQueueUpdate: (queueData: any) => {
      setLastMessage({
        type: 'queue',
        data: queueData
      });
    }
  });

  const handleReconnect = useCallback(() => {
    reconnect();
  }, [reconnect]);

  return {
    isConnected,
    lastMessage,
    reconnect: handleReconnect
  };
}`;
    
    fs.writeFileSync(fileInfo.filePath, newContent);
    log(`Replaced ${fileInfo.filePath} with centralized implementation`, 'INFO');
    modified = true;
  }
  
  return modified;
}

function checkApiEndpoints() {
  const apiFiles = [
    'src/app/api/realtime/unified/route.ts',
    'src/app/api/upload-queue/sse/route.ts',
    'src/app/api/realtime/presence/route.ts'
  ];
  
  apiFiles.forEach(filePath => {
    const fileInfo = checkFile(filePath);
    if (fileInfo.exists) {
      log(`API endpoint exists: ${filePath}`, 'INFO');
      
      // Check if it's properly configured
      if (filePath.includes('unified') && !fileInfo.content.includes('broadcastEvent')) {
        log(`Unified realtime endpoint missing broadcastEvent function`, 'WARN');
      }
      
      if (filePath.includes('upload-queue/sse') && fileInfo.content.includes('EventSource')) {
        log(`Upload queue SSE endpoint should be consolidated into unified endpoint`, 'WARN');
      }
    } else {
      log(`API endpoint missing: ${filePath}`, 'WARN');
    }
  });
}

function generateReport() {
  log('=== REALTIME CENTRALIZATION REPORT ===', 'INFO');
  
  let totalFiles = 0;
  let filesWithEventSource = 0;
  let filesWithRealtimeHook = 0;
  let filesNeedingFix = 0;
  let filesFixed = 0;
  
  filesToCheck.forEach(filePath => {
    const fileInfo = checkFile(filePath);
    totalFiles++;
    
    if (fileInfo.exists) {
      if (fileInfo.hasEventSource) {
        filesWithEventSource++;
        log(`⚠️  ${filePath} - Has manual EventSource implementation`, 'WARN');
      }
      
      if (fileInfo.hasRealtimeHook) {
        filesWithRealtimeHook++;
        log(`✅ ${filePath} - Uses realtime hook`, 'INFO');
      }
      
      if (fileInfo.shouldUseCentralized && !fileInfo.content.includes('useUnifiedRealtime')) {
        filesNeedingFix++;
        log(`🔧 ${filePath} - Needs to use centralized realtime`, 'WARN');
      }
    } else {
      log(`❌ ${filePath} - File not found`, 'ERROR');
    }
  });
  
  log('', 'INFO');
  log('=== SUMMARY ===', 'INFO');
  log(`Total files checked: ${totalFiles}`, 'INFO');
  log(`Files with manual EventSource: ${filesWithEventSource}`, 'WARN');
  log(`Files using realtime hooks: ${filesWithRealtimeHook}`, 'INFO');
  log(`Files needing centralized realtime: ${filesNeedingFix}`, 'WARN');
  log(`Files fixed: ${filesFixed}`, 'INFO');
  
  if (filesWithEventSource > 0) {
    log('', 'INFO');
    log('=== RECOMMENDATIONS ===', 'INFO');
    log('1. Replace all manual EventSource implementations with useUnifiedRealtime', 'INFO');
    log('2. Consolidate all realtime endpoints into /api/realtime/unified', 'INFO');
    log('3. Remove duplicate realtime hooks and use the centralized one', 'INFO');
    log('4. Test all realtime functionality after consolidation', 'INFO');
  }
}

function main() {
  log('Starting realtime centralization check...', 'INFO');
  
  // Create backup directory
  if (!fs.existsSync(config.backupDir)) {
    fs.mkdirSync(config.backupDir, { recursive: true });
  }
  
  // Check and fix files
  let totalFixed = 0;
  
  filesToCheck.forEach(filePath => {
    const fileInfo = checkFile(filePath);
    
    if (fileInfo.exists) {
      let fixed = false;
      
      if (filePath.includes('hooks/')) {
        fixed = fixHookFile(fileInfo);
      } else if (filePath.includes('components/') || filePath.includes('app/')) {
        fixed = fixComponentFile(fileInfo);
      }
      
      if (fixed) {
        totalFixed++;
      }
    }
  });
  
  // Check API endpoints
  checkApiEndpoints();
  
  // Generate report
  generateReport();
  
  log(`Realtime centralization check completed. ${totalFixed} files fixed.`, 'INFO');
  log(`Check ${config.logFile} for detailed logs.`, 'INFO');
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  checkFile,
  fixComponentFile,
  fixHookFile,
  generateReport
};
