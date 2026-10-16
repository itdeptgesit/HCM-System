/**
 * Replaces all `from 'lucide-react'` imports with `from '@/components/ui/icons'`
 * across the codebase (excluding node_modules, dist, and the icons bridge itself).
 */
const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'scripts'].includes(entry)) continue;
      results = results.concat(getFiles(full));
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

const root = process.cwd();
const files = getFiles(root);
let changed = 0;

for (const file of files) {
  // Skip the bridge file itself
  if (file.replace(/\\/g, '/').includes('components/ui/icons.tsx')) continue;

  let content = fs.readFileSync(file, 'utf8');

  // Match:  from 'lucide-react'  or  from "lucide-react"
  if (!content.includes('lucide-react')) continue;

  const updated = content.replace(
    /from\s+['"]lucide-react['"]/g,
    "from '@/components/ui/icons'"
  );

  if (updated !== content) {
    fs.writeFileSync(file, updated, 'utf8');
    console.log('Updated:', path.relative(root, file));
    changed++;
  }
}

console.log(`\nDone. ${changed} file(s) updated.`);
