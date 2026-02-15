import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const rootDir = process.cwd();
const manifestPath = path.join(rootDir, 'design/pwa-assets.json');
const publicDir = path.join(rootDir, 'public');
const indexPath = path.join(rootDir, 'index.html');
const vitePath = path.join(rootDir, 'vite.config.js');

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

const referencedFiles = [
  ...manifest.appleStartupImages.map((image) => image.href),
  ...manifest.vite.includeAssets,
  ...manifest.vite.manifestIcons.map((icon) => icon.src)
];

const uniqueFiles = [...new Set(referencedFiles)].sort((a, b) => a.localeCompare(b));
const missingFiles = [];

for (const relativeFile of uniqueFiles) {
  const filePath = path.join(publicDir, relativeFile);

  try {
    await access(filePath);
  } catch {
    missingFiles.push(relativeFile);
  }
}

if (missingFiles.length > 0) {
  throw new Error(`Missing files in public/:\n${missingFiles.map((file) => `- ${file}`).join('\n')}`);
}

const indexBefore = await readFile(indexPath, 'utf8');
const viteBefore = await readFile(vitePath, 'utf8');

// Note for non-coders: this makes CI fail if generated blocks in index.html/vite.config.js were not regenerated after editing design/pwa-assets.json.
await run('node', ['scripts/generate-pwa-assets.mjs']);

const indexAfter = await readFile(indexPath, 'utf8');
const viteAfter = await readFile(vitePath, 'utf8');

if (indexBefore !== indexAfter || viteBefore !== viteAfter) {
  throw new Error('Run `npm run pwa:generate` and commit the updated generated blocks in index.html and vite.config.js.');
}

console.log('PWA asset manifest references are valid and generated files are in sync.');

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}
