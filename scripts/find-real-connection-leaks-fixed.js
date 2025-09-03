#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
  try {
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
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  
  return results;
}

function analyzeFile(filePath, results) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Look for the specific pattern: client = await getPool().connect() without proper release
    const connectPattern = /(\w+)\s*=\s*await\s+getPool\(\)\.connect\(\)/g;
    const connectMatches = [...content.matchAll(connectPattern)];
    
    if (connectMatches.length > 0) {
      const fileResult = {
        file: filePath,
        issues: [],
        clientVariables: new Set()
      };
      
      for (const match of connectMatches) {
        const clientVar = match[1];
        fileResult.clientVariables.add(clientVar);
        
        // Check if this client variable is properly released
        const releasePattern = new RegExp(`${clientVar}\\.release\\(\\)`, 'g');
        const hasRelease = releasePattern.test(content);
        
        // Check if there's a try-finally block around the client usage
        const tryFinallyPattern = new RegExp(
          `try\\s*\\{[\\s\\S]*?${clientVar}\\.[\\s\\S]*?\\}\\s*finally\\s*\\{[\\s\\S]*?${clientVar}\\.release\\(\\)[\\s\\S]*?\\}`,
          'g'
        );
        const hasTryFinally = tryFinallyPattern.test(content);
        
        // Check if the file uses wrapper functions
        const usesWrapper = /withDbClient\(|withDbTransaction\(/g.test(content);
        
        if (!hasRelease && !usesWrapper) {
          fileResult.issues.push(`❌ NO CLIENT RELEASE for ${clientVar} - Major connection leak!`);
        } else if (!hasTryFinally && hasRelease && !usesWrapper) {
          fileResult.issues.push(`⚠️  ${clientVar} has release but missing try-finally pattern`);
        } else if (usesWrapper) {
          fileResult.issues.push(`✅ Uses wrapper functions - good practice`);
        } else if (hasTryFinally) {
          fileResult.issues.push(`✅ ${clientVar} has proper try-finally pattern`);
        } else if (hasRelease) {
          fileResult.issues.push(`✅ ${clientVar} has client release`);
        }
      }
      
      // Only include files with actual issues
      if (fileResult.issues.length > 0) {
        results.push(fileResult);
      }
    }
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
  }
}

function printResults(results) {
  console.log('🔍 Real Database Connection Leak Analysis\n');
  
  if (results.length === 0) {
    console.log('✅ No connection issues found!');
    return;
  }
  
  // Group by severity
  const critical = results.filter(r => r.issues.some(i => i.includes('❌')));
  const warnings = results.filter(r => r.issues.some(i => i.includes('⚠️')));
  const good = results.filter(r => r.issues.every(i => i.includes('✅')));
  
  if (critical.length > 0) {
    console.log('🚨 CRITICAL ISSUES - Real Connection Leaks Found:');
    console.log('=' .repeat(80));
    critical.forEach(file => {
      console.log(`\n📁 ${file.file}`);
      file.issues.forEach(issue => console.log(`   ${issue}`));
      if (file.clientVariables.size > 0) {
        console.log(`   Client variables: ${Array.from(file.clientVariables).join(', ')}`);
      }
    });
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS - Potential Issues:');
    console.log('=' .repeat(80));
    warnings.forEach(file => {
      console.log(`\n📁 ${file.file}`);
      file.issues.forEach(issue => console.log(`   ${issue}`));
      if (file.clientVariables.size > 0) {
        console.log(`   Client variables: ${Array.from(file.clientVariables).join(', ')}`);
      }
    });
    console.log('');
  }
  
  if (good.length > 0) {
    console.log('✅ GOOD PRACTICES - Well-Managed Connections:');
    console.log('=' .repeat(80));
    good.forEach(file => {
      console.log(`\n📁 ${file.file}`);
      file.issues.forEach(issue => console.log(`   ${issue}`));
      if (file.clientVariables.size > 0) {
        console.log(`   Client variables: ${Array.from(file.clientVariables).join(', ')}`);
      }
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
try {
  const srcDir = path.join(__dirname, '..', 'src');
  console.log(`🔍 Scanning for real connection leaks in: ${srcDir}\n`);
  
  const results = findConnectionLeaks(srcDir);
  printResults(results);
} catch (error) {
  console.error('Error running connection leak analysis:', error.message);
  process.exit(1);
}
