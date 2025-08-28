const fs = require('fs');
const path = require('path');

function fixApiRoute(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix params type from { params: { id: string } } to { params: Promise<{ id: string }> }
  content = content.replace(
    /params\}: \{ params: \{ ([^}]+) \}\}/g,
    (match, paramsContent) => {
      modified = true;
      return `params}: { params: Promise<{ ${paramsContent} }> }`;
    }
  );

  // Fix params destructuring from const { id } = params; to const { id } = await params;
  content = content.replace(
    /const \{ ([^}]+) \} = params;/g,
    (match, destructured) => {
      modified = true;
      return `const { ${destructured} } = await params;`;
    }
  );

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file === 'route.ts') {
      fixApiRoute(filePath);
    }
  });
}

// Start from the api directory
const apiDir = path.join(__dirname, 'src', 'app', 'api');
if (fs.existsSync(apiDir)) {
  console.log('Fixing API routes...');
  walkDir(apiDir);
  console.log('Done!');
} else {
  console.log('API directory not found');
}
