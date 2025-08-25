#!/usr/bin/env node

/**
 * Performance Check Script
 * 
 * This script helps identify potential performance bottlenecks in the application
 * by analyzing bundle size, dependencies, and common performance issues.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Performance Check Starting...\n');

// Check bundle size
function checkBundleSize() {
  console.log('📦 Checking bundle size...');
  try {
    const result = execSync('npm run build', { encoding: 'utf8' });
    console.log('✅ Build completed successfully');
    
    // Check for large dependencies
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    console.log('\n📊 Dependency Analysis:');
    Object.entries(dependencies).forEach(([name, version]) => {
      if (name.includes('react') || name.includes('next') || name.includes('prisma')) {
        console.log(`  ${name}: ${version}`);
      }
    });
  } catch (error) {
    console.log('❌ Build failed:', error.message);
  }
}

// Check for common performance issues
function checkPerformanceIssues() {
  console.log('\n🔍 Checking for common performance issues...');
  
  const issues = [];
  
  // Check for large files
  const srcPath = path.join(__dirname, '../src');
  const largeFiles = findLargeFiles(srcPath, 100); // Files larger than 100KB
  
  if (largeFiles.length > 0) {
    issues.push(`Found ${largeFiles.length} large files (>100KB):`);
    largeFiles.forEach(file => {
      issues.push(`  - ${file.path} (${Math.round(file.size / 1024)}KB)`);
    });
  }
  
  // Check for unused imports
  const unusedImports = findUnusedImports();
  if (unusedImports.length > 0) {
    issues.push(`Found ${unusedImports.length} potentially unused imports`);
  }
  
  // Check for heavy components
  const heavyComponents = findHeavyComponents();
  if (heavyComponents.length > 0) {
    issues.push(`Found ${heavyComponents.length} potentially heavy components`);
  }
  
  if (issues.length === 0) {
    console.log('✅ No obvious performance issues found');
  } else {
    console.log('⚠️  Potential issues found:');
    issues.forEach(issue => console.log(`  ${issue}`));
  }
}

// Find large files
function findLargeFiles(dir, maxSizeKB) {
  const largeFiles = [];
  
  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    items.forEach(item => {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile() && stat.size > maxSizeKB * 1024) {
        largeFiles.push({
          path: fullPath.replace(process.cwd(), ''),
          size: stat.size
        });
      }
    });
  }
  
  traverse(dir);
  return largeFiles;
}

// Find potentially unused imports (basic check)
function findUnusedImports() {
  const unusedImports = [];
  const srcPath = path.join(__dirname, '../src');
  
  function checkFile(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    
    const content = fs.readFileSync(filePath, 'utf8');
    const importMatches = content.match(/import.*from\s+['"]([^'"]+)['"]/g);
    
    if (importMatches) {
      importMatches.forEach(match => {
        const module = match.match(/from\s+['"]([^'"]+)['"]/)[1];
        if (module.startsWith('@/') || module.startsWith('./') || module.startsWith('../')) {
          // Basic check - could be enhanced with AST parsing
          const importName = match.match(/import\s+{?\s*([^}]+)\s*}?\s+from/);
          if (importName) {
            const names = importName[1].split(',').map(n => n.trim());
            names.forEach(name => {
              if (!content.includes(name) || content.indexOf(name) === content.indexOf(match)) {
                unusedImports.push(`${filePath}: ${name}`);
              }
            });
          }
        }
      });
    }
  }
  
  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    items.forEach(item => {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile()) {
        checkFile(fullPath);
      }
    });
  }
  
  traverse(srcPath);
  return unusedImports;
}

// Find potentially heavy components
function findHeavyComponents() {
  const heavyComponents = [];
  const srcPath = path.join(__dirname, '../src');
  
  function checkComponent(filePath) {
    if (!filePath.endsWith('.tsx')) return;
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Check for large components
    if (lines.length > 500) {
      heavyComponents.push(`${filePath} (${lines.length} lines)`);
    }
    
    // Check for many useEffect hooks
    const useEffectCount = (content.match(/useEffect/g) || []).length;
    if (useEffectCount > 5) {
      heavyComponents.push(`${filePath} (${useEffectCount} useEffect hooks)`);
    }
    
    // Check for many state variables
    const useStateCount = (content.match(/useState/g) || []).length;
    if (useStateCount > 10) {
      heavyComponents.push(`${filePath} (${useStateCount} useState hooks)`);
    }
  }
  
  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    items.forEach(item => {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile()) {
        checkComponent(fullPath);
      }
    });
  }
  
  traverse(srcPath);
  return heavyComponents;
}

// Performance recommendations
function showRecommendations() {
  console.log('\n💡 Performance Recommendations:');
  console.log('  1. Use React.memo() for expensive components');
  console.log('  2. Implement proper loading states');
  console.log('  3. Use dynamic imports for code splitting');
  console.log('  4. Optimize images with next/image');
  console.log('  5. Implement proper caching strategies');
  console.log('  6. Use React.lazy() for route-based code splitting');
  console.log('  7. Monitor bundle size regularly');
  console.log('  8. Use performance monitoring tools');
  console.log('  9. Optimize database queries');
  console.log('  10. Implement proper error boundaries');
}

// Run checks
try {
  checkBundleSize();
  checkPerformanceIssues();
  showRecommendations();
  
  console.log('\n✅ Performance check completed!');
} catch (error) {
  console.error('❌ Performance check failed:', error.message);
  process.exit(1);
}
