import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const manifestPath = path.join(rootDir, 'design/pwa-assets.json');
const indexPath = path.join(rootDir, 'index.html');
const vitePath = path.join(rootDir, 'vite.config.js');

const manifestRaw = await readFile(manifestPath, 'utf8');
const manifest = JSON.parse(manifestRaw);

const appleStartupBlock = [
  '    <!-- Note for non-coders: these launch-image links are generated from design/pwa-assets.json to avoid manual copy/paste mistakes. -->',
  ...manifest.appleStartupImages.map(
    (image) =>
      `    <link rel="apple-touch-startup-image" href="/${image.href}" media="${image.media}">`
  )
].join('\n');

const includeAssetsBlock = [
  '      // Note for non-coders: this list is generated from design/pwa-assets.json so every install-related file stays in one source-of-truth.',
  '      includeAssets: [',
  ...manifest.vite.includeAssets.map((asset) => `        "${asset}",`),
  '      ],'
].join('\n');

const manifestIconsBlock = [
  '        // Note for non-coders: these install icon entries are generated from design/pwa-assets.json so Android/Desktop install data stays in sync.',
  '        icons: [',
  ...manifest.vite.manifestIcons.flatMap((icon) => [
    '          {',
    `            src: "${icon.src}",`,
    `            sizes: "${icon.sizes}",`,
    `            type: "${icon.type}",`,
    `            purpose: "${icon.purpose}",`,
    '          },'
  ]),
  '        ],'
].join('\n');

const indexRaw = await readFile(indexPath, 'utf8');
const viteRaw = await readFile(vitePath, 'utf8');

const nextIndex = replaceBetween(indexRaw, '<!-- PWA_ASSETS:APPLE_STARTUP_START -->', '<!-- PWA_ASSETS:APPLE_STARTUP_END -->', appleStartupBlock);
const nextViteWithAssets = replaceBetween(viteRaw, '// PWA_ASSETS:INCLUDE_ASSETS_START', '// PWA_ASSETS:INCLUDE_ASSETS_END', includeAssetsBlock);
const nextVite = replaceBetween(nextViteWithAssets, '// PWA_ASSETS:MANIFEST_ICONS_START', '// PWA_ASSETS:MANIFEST_ICONS_END', manifestIconsBlock);

await writeFile(indexPath, nextIndex, 'utf8');
await writeFile(vitePath, nextVite, 'utf8');

console.log('Generated Apple startup links + Vite PWA icon/includeAssets blocks from design/pwa-assets.json');

function replaceBetween(content, startMarker, endMarker, replacement) {
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker, startIndex);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(`Could not find markers ${startMarker} / ${endMarker}`);
  }

  const startLineEnd = content.indexOf('\n', startIndex);
  const endLineStart = content.lastIndexOf('\n', endIndex - 1) + 1;

  return `${content.slice(0, startLineEnd + 1)}${replacement}\n${content.slice(endLineStart)}`;
}
