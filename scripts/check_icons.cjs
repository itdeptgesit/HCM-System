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
const regex = /import\s*\{([^}]+)\}\s*from\s*['"](?:lucide-react|@\/components\/ui\/icons)['"]/g;

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let match;
  while ((match = regex.exec(content)) !== null) {
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

import('lucide-react').then(lucide => {
  const missing = [];
  const found = [];
  iconSet.forEach(name => {
    if (!lucide[name]) {
      missing.push(name);
    } else {
      found.push(name);
    }
  });
  console.log('Total unique icons detected:', iconSet.size);
  console.log('Directly found in lucide-react:', found.length);
  console.log('Missing/Aliases needed in lucide-react:', missing);
});
