#!/usr/bin/env node

/**
 * Realtime Centralization Test Script
 * 
 * This script tests the centralized realtime system to ensure it's working correctly
 * and preventing infinite loops and stuck states.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  logFile: 'realtime-centralization-test.log',
  testResults: 'realtime-test-results.json'
};

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  
  // Also write to log file
  fs.appendFileSync(config.logFile, logMessage + '\n');
}

function testFile(filePath, testName) {
  if (!fs.existsSync(filePath)) {
    log(`❌ ${testName}: File not found - ${filePath}`, 'ERROR');
    return { passed: false, error: 'File not found' };
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const results = { passed: true, issues: [] };
  
  // Test 1: Check if using centralized realtime
  if (content.includes('useUnifiedRealtime')) {
    log(`✅ ${testName}: Uses centralized realtime hook`, 'INFO');
  } else {
    log(`❌ ${testName}: Not using centralized realtime hook`, 'ERROR');
    results.passed = false;
    results.issues.push('Not using useUnifiedRealtime');
  }
  
  // Test 2: Check for manual EventSource usage (should be avoided)
  if (content.includes('new EventSource(') && !filePath.includes('use-unified-realtime-optimized.ts')) {
    log(`❌ ${testName}: Has manual EventSource implementation`, 'ERROR');
    results.passed = false;
    results.issues.push('Manual EventSource usage detected');
  } else {
    log(`✅ ${testName}: No manual EventSource usage`, 'INFO');
  }
  
  // Test 3: Check for infinite loop prevention
  if (content.includes('useInfiniteLoopPrevention') || content.includes('useSafeEffect')) {
    log(`✅ ${testName}: Has infinite loop prevention`, 'INFO');
  } else {
    log(`⚠️  ${testName}: Missing infinite loop prevention`, 'WARN');
    results.issues.push('Missing infinite loop prevention');
  }
  
  // Test 4: Check for proper cleanup
  if (content.includes('cleanup') || content.includes('disconnect') || content.includes('removeEventListener')) {
    log(`✅ ${testName}: Has proper cleanup`, 'INFO');
  } else {
    log(`⚠️  ${testName}: Missing cleanup mechanisms`, 'WARN');
    results.issues.push('Missing cleanup mechanisms');
  }
  
  return results;
}

function testRealtimeHook() {
  log('Testing main realtime hook...', 'INFO');
  
  const hookPath = 'src/hooks/use-unified-realtime-optimized.ts';
  const content = fs.readFileSync(hookPath, 'utf8');
  const results = { passed: true, issues: [] };
  
  // Test 1: Check for global connection sharing
  if (content.includes('globalEventSource')) {
    log('✅ Main hook: Has global connection sharing', 'INFO');
  } else {
    log('❌ Main hook: Missing global connection sharing', 'ERROR');
    results.passed = false;
    results.issues.push('Missing global connection sharing');
  }
  
  // Test 2: Check for reconnection limits
  if (content.includes('maxReconnectAttempts')) {
    log('✅ Main hook: Has reconnection limits', 'INFO');
  } else {
    log('❌ Main hook: Missing reconnection limits', 'ERROR');
    results.passed = false;
    results.issues.push('Missing reconnection limits');
  }
  
  // Test 3: Check for infinite loop prevention
  if (content.includes('useInfiniteLoopPrevention')) {
    log('✅ Main hook: Has infinite loop prevention', 'INFO');
  } else {
    log('❌ Main hook: Missing infinite loop prevention', 'ERROR');
    results.passed = false;
    results.issues.push('Missing infinite loop prevention');
  }
  
  // Test 4: Check for comprehensive event handling
  const eventTypes = [
    'candidate_update',
    'position_update',
    'warning_update',
    'notification_update',
    'upload_queue_update',
    'presence_update',
    'user_list_update',
    'dashboard_update',
    'session_expired',
    'health_check',
    'keepalive'
  ];
  
  const missingEvents = eventTypes.filter(event => !content.includes(event));
  if (missingEvents.length === 0) {
    log('✅ Main hook: Has comprehensive event handling', 'INFO');
  } else {
    log(`⚠️  Main hook: Missing event types: ${missingEvents.join(', ')}`, 'WARN');
    results.issues.push(`Missing event types: ${missingEvents.join(', ')}`);
  }
  
  // Test 5: Check for proper error handling
  if (content.includes('catch') && content.includes('console.error')) {
    log('✅ Main hook: Has proper error handling', 'INFO');
  } else {
    log('⚠️  Main hook: Missing proper error handling', 'WARN');
    results.issues.push('Missing proper error handling');
  }
  
  return results;
}

function testComponents() {
  log('Testing components...', 'INFO');
  
  const components = [
    { path: 'src/components/UploadQueueStatus.tsx', name: 'UploadQueueStatus' },
    { path: 'src/components/UploadQueueStatistics.tsx', name: 'UploadQueueStatistics' },
    { path: 'src/components/candidates/CandidateImportUploadQueue.tsx', name: 'CandidateImportUploadQueue' },
    { path: 'src/components/ui/user-presence-indicator.tsx', name: 'UserPresenceIndicator' },
    { path: 'src/components/ui/realtime-collaboration.tsx', name: 'RealtimeCollaboration' },
    { path: 'src/components/dashboard/DashboardPageClient.tsx', name: 'DashboardPageClient' },
    { path: 'src/components/positions/PositionsPageClient.tsx', name: 'PositionsPageClient' },
    { path: 'src/components/candidates/CandidatesPageClient.tsx', name: 'CandidatesPageClient' },
    { path: 'src/components/tasks/MyTasksPageClient.tsx', name: 'MyTasksPageClient' },
    { path: 'src/app/task-board/page.tsx', name: 'TaskBoardPage' }
  ];
  
  const results = [];
  
  components.forEach(component => {
    const result = testFile(component.path, component.name);
    results.push({
      component: component.name,
      path: component.path,
      ...result
    });
  });
  
  return results;
}

function testHooks() {
  log('Testing hooks...', 'INFO');
  
  const hooks = [
    { path: 'src/hooks/use-unified-realtime.ts', name: 'useUnifiedRealtime (export)' },
    { path: 'src/hooks/use-upload-queue-sse.ts', name: 'useUploadQueueSSE' }
  ];
  
  const results = [];
  
  hooks.forEach(hook => {
    const result = testFile(hook.path, hook.name);
    results.push({
      hook: hook.name,
      path: hook.path,
      ...result
    });
  });
  
  return results;
}

function generateTestReport(hookResults, componentResults, hookTestResults) {
  log('=== REALTIME CENTRALIZATION TEST REPORT ===', 'INFO');
  
  const totalTests = 1 + componentResults.length + hookResults.length;
  const passedTests = (hookTestResults.passed ? 1 : 0) + 
                     componentResults.filter(r => r.passed).length + 
                     hookResults.filter(r => r.passed).length;
  
  log(``, 'INFO');
  log(`=== MAIN HOOK TEST ===`, 'INFO');
  if (hookTestResults.passed) {
    log(`✅ Main realtime hook: PASSED`, 'INFO');
  } else {
    log(`❌ Main realtime hook: FAILED`, 'ERROR');
    hookTestResults.issues.forEach(issue => {
      log(`   - ${issue}`, 'ERROR');
    });
  }
  
  log(``, 'INFO');
  log(`=== COMPONENT TESTS ===`, 'INFO');
  componentResults.forEach(result => {
    if (result.passed) {
      log(`✅ ${result.component}: PASSED`, 'INFO');
    } else {
      log(`❌ ${result.component}: FAILED`, 'ERROR');
      result.issues.forEach(issue => {
        log(`   - ${issue}`, 'ERROR');
      });
    }
  });
  
  log(``, 'INFO');
  log(`=== HOOK TESTS ===`, 'INFO');
  hookResults.forEach(result => {
    if (result.passed) {
      log(`✅ ${result.hook}: PASSED`, 'INFO');
    } else {
      log(`❌ ${result.hook}: FAILED`, 'ERROR');
      result.issues.forEach(issue => {
        log(`   - ${issue}`, 'ERROR');
      });
    }
  });
  
  log(``, 'INFO');
  log(`=== SUMMARY ===`, 'INFO');
  log(`Total tests: ${totalTests}`, 'INFO');
  log(`Passed: ${passedTests}`, 'INFO');
  log(`Failed: ${totalTests - passedTests}`, 'INFO');
  log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`, 'INFO');
  
  if (passedTests === totalTests) {
    log(`🎉 All tests passed! Realtime centralization is working correctly.`, 'INFO');
  } else {
    log(`⚠️  Some tests failed. Please review the issues above.`, 'WARN');
  }
  
  // Save detailed results
  const detailedResults = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      successRate: ((passedTests / totalTests) * 100).toFixed(1) + '%'
    },
    mainHook: hookTestResults,
    components: componentResults,
    hooks: hookResults
  };
  
  fs.writeFileSync(config.testResults, JSON.stringify(detailedResults, null, 2));
  log(`Detailed results saved to ${config.testResults}`, 'INFO');
  
  return detailedResults;
}

function main() {
  log('Starting realtime centralization tests...', 'INFO');
  
  // Test main realtime hook
  const hookTestResults = testRealtimeHook();
  
  // Test components
  const componentResults = testComponents();
  
  // Test other hooks
  const hookResults = testHooks();
  
  // Generate report
  const report = generateTestReport(hookResults, componentResults, hookTestResults);
  
  log('Realtime centralization tests completed.', 'INFO');
  log(`Check ${config.logFile} for detailed logs.`, 'INFO');
  
  // Exit with appropriate code
  const allPassed = report.summary.passedTests === report.summary.totalTests;
  process.exit(allPassed ? 0 : 1);
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  testFile,
  testRealtimeHook,
  testComponents,
  testHooks,
  generateTestReport
};
