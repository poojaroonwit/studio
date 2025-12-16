const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
                walk(filePath, fileList);
            }
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                fileList.push(filePath);
            }
        }
    });
    return fileList;
}

const srcDir = path.join(process.cwd(), 'src');
const files = walk(srcDir);
const iconCounts = {};

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    // Regex to capture imports from lucide-react
    // Supports multiline imports
    const importRegex = /import\s+{([^}]+)}\s+from\s+['"]lucide-react['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
        const imports = match[1].split(',').map(s => s.trim()).filter(s => s);
        imports.forEach(imp => {
            // Handle "Icon as Alias" key
            const name = imp.split(/\s+as\s+/)[0].trim();
            iconCounts[name] = (iconCounts[name] || 0) + 1;
        });
    }
});

const sortedIcons = Object.entries(iconCounts).sort((a, b) => b[1] - a[1]);

console.log('--- LUCIDE ICONS FOUND ---');
sortedIcons.forEach(([icon, count]) => {
    console.log(`${icon}: ${count}`);
});
console.log('--- END ---');
