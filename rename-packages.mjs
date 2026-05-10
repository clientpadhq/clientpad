import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const packageMapping = {
  '@clientpad/core': '@clientpad/core',
  '@clientpad/cli': '@clientpad/cli',
  '@clientpad/server': '@clientpad/server',
  '@clientpad/sdk': '@clientpad/sdk',
  '@clientpad/whatsapp': '@clientpad/whatsapp',
  '@clientpad/cloud': '@clientpad/cloud',
  '@clientpad/dashboard': '@clientpad/dashboard',
  '@clientpad/core': '@clientpad/core',
  '@clientpad/cli': '@clientpad/cli',
  '@clientpad/server': '@clientpad/server',
  '@clientpad/sdk': '@clientpad/sdk',
  '@clientpad/whatsapp': '@clientpad/whatsapp',
  '@clientpad/cloud': '@clientpad/cloud',
  '@clientpad/dashboard': '@clientpad/dashboard',
};

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next' && file !== 'dist') {
        arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
      }
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });

  return arrayOfFiles;
}

const files = getAllFiles('.');

files.forEach(file => {
  const ext = path.extname(file);
  if (['.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.toml', '.yml', '.sql'].includes(ext) || file.endsWith('.env.example')) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    for (const [oldName, newName] of Object.entries(packageMapping)) {
      // Use regex for more robust replacement, especially for imports and scripts
      // We want to replace the whole name, sometimes followed by a slash for sub-paths
      // The regex needs to be careful to not replace parts of other names.
      // Use word boundaries or ensure it's a full import path.
      // For simplicity here, we'll replace the exact string.
      const escapedOldName = oldName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'); // Escape special regex characters
      const regex = new RegExp(`(['"])${escapedOldName}(['"])`, 'g'); // Match import paths within quotes
      
      if (regex.test(content)) {
        content = content.replace(regex, `$1${newName}$2`);
        changed = true;
      }
    }

    if (changed) {
      console.log(`Updating ${file}`);
      fs.writeFileSync(file, content, 'utf8');
    }
  }
});
