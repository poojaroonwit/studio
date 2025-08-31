#!/usr/bin/env node

/**
 * Test script to monitor AppLayout performance
 * Run with: node scripts/test-app-layout-performance.js
 */

const puppeteer = require('puppeteer');

async function testAppLayoutPerformance() {
  console.log('🚀 Starting AppLayout performance test...');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Enable performance monitoring
  await page.evaluateOnNewDocument(() => {
    // Override console methods to capture performance warnings
    const originalWarn = console.warn;
    const originalError = console.error;
    
    window.performanceWarnings = [];
    window.performanceErrors = [];
    
    console.warn = (...args) => {
      if (args[0]?.includes('Frequent renders') || args[0]?.includes('Excessive renders')) {
        window.performanceWarnings.push(args);
      }
      originalWarn.apply(console, args);
    };
    
    console.error = (...args) => {
      if (args[0]?.includes('Frequent renders') || args[0]?.includes('Excessive renders')) {
        window.performanceErrors.push(args);
      }
      originalError.apply(console, args);
    };
  });

  try {
    // Navigate to the app
    console.log('📱 Navigating to app...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    // Wait for AppLayout to load
    await page.waitForSelector('[data-testid="app-layout"]', { timeout: 10000 });
    
    console.log('✅ AppLayout loaded successfully');
    
    // Monitor for 30 seconds
    console.log('⏱️  Monitoring performance for 30 seconds...');
    
    const startTime = Date.now();
    const monitoringDuration = 30000; // 30 seconds
    
    // Perform some user interactions to trigger potential re-renders
    const interactions = [
      () => page.click('[data-testid="sidebar-toggle"]'),
      () => page.click('[data-testid="theme-toggle"]'),
      () => page.click('[data-testid="user-menu"]'),
      () => page.keyboard.press('Escape'),
      () => page.mouse.move(100, 100),
      () => page.mouse.move(200, 200),
    ];
    
    let interactionIndex = 0;
    
    const interval = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      
      if (elapsed >= monitoringDuration) {
        clearInterval(interval);
        await analyzeResults(page);
        await browser.close();
        return;
      }
      
      // Perform random interactions
      if (interactionIndex < interactions.length) {
        try {
          await interactions[interactionIndex]();
          interactionIndex++;
        } catch (error) {
          // Ignore interaction errors
        }
      }
      
      // Log progress
      if (elapsed % 5000 === 0) {
        console.log(`⏳ ${elapsed / 1000}s elapsed...`);
      }
    }, 1000);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await browser.close();
  }
}

async function analyzeResults(page) {
  console.log('\n📊 Analyzing performance results...');
  
  const results = await page.evaluate(() => {
    const warnings = window.performanceWarnings || [];
    const errors = window.performanceErrors || [];
    
    return {
      warnings: warnings.length,
      errors: errors.length,
      warningDetails: warnings,
      errorDetails: errors,
      renderCount: warnings.filter(w => w[0]?.includes('render')).length,
      frequentRenders: warnings.filter(w => w[0]?.includes('Frequent renders')).length,
      excessiveRenders: errors.filter(e => e[0]?.includes('Excessive renders')).length,
    };
  });
  
  console.log('\n📈 Performance Results:');
  console.log('========================');
  console.log(`Total Warnings: ${results.warnings}`);
  console.log(`Total Errors: ${results.errors}`);
  console.log(`Render-related Warnings: ${results.renderCount}`);
  console.log(`Frequent Renders: ${results.frequentRenders}`);
  console.log(`Excessive Renders: ${results.excessiveRenders}`);
  
  if (results.frequentRenders > 0) {
    console.log('\n⚠️  Frequent render warnings detected:');
    results.warningDetails
      .filter(w => w[0]?.includes('Frequent renders'))
      .forEach(w => console.log(`  - ${w[0]}`));
  }
  
  if (results.excessiveRenders > 0) {
    console.log('\n🚨 Excessive render errors detected:');
    results.errorDetails
      .filter(e => e[0]?.includes('Excessive renders'))
      .forEach(e => console.log(`  - ${e[0]}`));
  }
  
  // Performance assessment
  console.log('\n🎯 Performance Assessment:');
  if (results.excessiveRenders === 0 && results.frequentRenders <= 2) {
    console.log('✅ Excellent performance! No critical issues detected.');
  } else if (results.excessiveRenders === 0 && results.frequentRenders <= 5) {
    console.log('⚠️  Good performance with minor issues. Consider further optimization.');
  } else if (results.excessiveRenders > 0) {
    console.log('🚨 Critical performance issues detected! Immediate optimization required.');
  } else {
    console.log('⚠️  Performance issues detected. Consider optimization.');
  }
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  if (results.frequentRenders > 0) {
    console.log('  - Review useMemo and useCallback usage in AppLayout');
    console.log('  - Check for unnecessary re-renders in child components');
    console.log('  - Consider implementing React.memo for expensive components');
  }
  
  if (results.excessiveRenders > 0) {
    console.log('  - Investigate infinite loops in useEffect hooks');
    console.log('  - Check for circular dependencies in state updates');
    console.log('  - Review event listener cleanup');
  }
}

// Run the test
if (require.main === module) {
  testAppLayoutPerformance().catch(console.error);
}

module.exports = { testAppLayoutPerformance, analyzeResults };
