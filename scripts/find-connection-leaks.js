#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Patterns to search for
const patterns = {
  // Direct connection creation
  connectCall: /getPool\(\)\.connect\(\)/g,
  // Client variable declaration
  clientVar: /const\s+client\s*=\s*await\s+getPool\(\)\.connect\(\)/g,
  // Client release
  clientRelease: /client\.release\(\)/g,
  // Try-finally pattern
  tryFinally: /try\s*\{[\s\S]*?\}\s*finally\s*\{[\s\S]*?client\.release\(\)[\s\S]*?\}/g,
  // WithDbClient usage
  withDbClient: /withDbClient\(/g,
  // WithDbTransaction usage
  withDbTransaction: /withDbTransaction\(/g
};

// Files to exclude
const excludePatterns = [
  /node_modules/,
  /\.git/,
  /dist/,
  /\.next/,
  /\.swc/,
  /\.tsbuildinfo$/,
  /\.log$/,
  /\.md$/,
  /\.sql$/,
  /\.yml$/,
  /\.yaml$/,
  /\.json$/,
  /\.lock$/,
  /\.env/
];

// File extensions to include
const includeExtensions = ['.ts', '.tsx', '.js', '.jsx'];

function shouldExcludeFile(filePath) {
  return excludePatterns.some(pattern => pattern.test(filePath));
}

function shouldIncludeFile(filePath) {
  return includeExtensions.some(ext => filePath.endsWith(ext));
}

function findConnectionLeaks(dir, results = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!shouldExcludeFile(filePath)) {
        findConnectionLeaks(filePath, results);
      }
    } else if (shouldIncludeFile(filePath)) {
      analyzeFile(filePath, results);
    }
  }
  
  return results;
}

function analyzeFile(filePath, results) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Find all connect() calls
    const connectMatches = [...content.matchAll(patterns.connectCall)];
    
    if (connectMatches.length > 0) {
      const fileResult = {
        file: filePath,
        connectCalls: [],
        hasRelease: false,
        hasTryFinally: false,
        usesWrapper: false,
        issues: []
      };
      
      // Check each connect call
      for (const match of connectMatches) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const line = lines[lineNumber - 1]?.trim() || '';
        
        fileResult.connectCalls.push({
          line: lineNumber,
          code: line
        });
      }
      
      // Check if file uses wrapper functions
      if (patterns.withDbClient.test(content) || patterns.withDbTransaction.test(content)) {
        fileResult.usesWrapper = true;
      }
      
      // Check if file has client.release()
      if (patterns.clientRelease.test(content)) {
        fileResult.hasRelease = true;
      }
      
      // Check if file has proper try-finally pattern
      if (patterns.tryFinally.test(content)) {
        fileResult.hasTryFinally = true;
      }
      
      // Determine issues
      if (fileResult.connectCalls.length > 0) {
        if (!fileResult.hasRelease && !fileResult.usesWrapper) {
          fileResult.issues.push('❌ NO CLIENT RELEASE - Major connection leak!');
        } else if (!fileResult.hasTryFinally && fileResult.hasRelease) {
          fileResult.issues.push('⚠️  Missing try-finally pattern - potential leak in error cases');
        } else if (fileResult.usesWrapper) {
          fileResult.issues.push('✅ Uses wrapper functions - good practice');
        } else if (fileResult.hasTryFinally) {
          fileResult.issues.push('✅ Has proper try-finally pattern');
        }
      }
      
      // Only include files with actual issues or interesting patterns
      if (fileResult.issues.length > 0 || fileResult.connectCalls.length > 0) {
        results.push(fileResult);
      }
    }
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
  }
}

function printResults(results) {
  console.log('🔍 Database Connection Leak Analysis\n');
  
  if (results.length === 0) {
    console.log('✅ No connection issues found!');
    return;
  }
  
  // Group by severity
  const critical = results.filter(r => r.issues.some(i => i.includes('❌')));
  const warnings = results.filter(r => r.issues.some(i => i.includes('⚠️')));
  const good = results.filter(r => r.issues.some(i => i.includes('✅')));
  
  if (critical.length > 0) {
    console.log('🚨 CRITICAL ISSUES - Connection Leaks Found:');
    console.log('=' .repeat(80));
    critical.forEach(file => {
      console.log(`\n📁 ${file.file}`);
      file.issues.forEach(issue => console.log(`   ${issue}`));
      file.connectCalls.forEach(call => {
        console.log(`   Line ${call.line}: ${call.code}`);
      });
    });
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS - Potential Issues:');
    console.log('=' .repeat(80));
    warnings.forEach(file => {
      console.log(`\n📁 ${file.file}`);
      file.issues.forEach(issue => console.log(`   ${issue}`));
    });
    console.log('');
  }
  
  if (good.length > 0) {
    console.log('✅ GOOD PRACTICES - Well-Managed Connections:');
    console.log('=' .repeat(80));
    good.forEach(file => {
      console.log(`\n📁 ${file.file}`);
      file.issues.forEach(issue => console.log(`   ${issue}`));
    });
    console.log('');
  }
  
  // Summary
  console.log('📊 SUMMARY:');
  console.log(`   Total files with connections: ${results.length}`);
  console.log(`   Critical issues: ${critical.length}`);
  console.log(`   Warnings: ${warnings.length}`);
  console.log(`   Good practices: ${good.length}`);
  
  if (critical.length > 0) {
    console.log('\n🚨 IMMEDIATE ACTION REQUIRED:');
    console.log('   Fix connection leaks in critical files above');
    console.log('   Use try-finally blocks with client.release()');
    console.log('   Consider using withDbClient() wrapper functions');
  }
  
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('   1. Always use try-finally blocks with client.release()');
  console.log('   2. Use withDbClient() and withDbTransaction() wrappers');
  console.log('   3. Test error scenarios to ensure connections are released');
  console.log('   4. Monitor connection pool usage after fixes');
}

// Main execution
const srcDir = path.join(__dirname, '..', 'src');
console.log(`🔍 Scanning for connection leaks in: ${srcDir}\n`);

const results = findConnectionLeaks(srcDir);
printResults(results);
