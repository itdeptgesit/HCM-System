const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
        results = results.concat(getFiles(file));
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = getFiles('.');
const iconSet = new Set();
const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g;

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const names = match[1]
      .replace(/\/\/.*$/gm, '')
      .split(',')
      .map(s => s.trim().split(' as ')[0].trim())
      .filter(Boolean);
    names.forEach(n => {
      if (n && !n.startsWith('type ') && !n.includes('\n')) {
        iconSet.add(n);
      }
    });
  }
});

console.log('Total unique lucide icons used:', iconSet.size);
console.log('Icons list:', JSON.stringify(Array.from(iconSet).sort(), null, 2));
