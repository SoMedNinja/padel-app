import { spawn } from 'node:child_process';

// Note for non-coders: this script re-generates token files and fails if Git sees differences.
await run('node', ['scripts/generate-design-tokens.mjs']);
await run('git', [
  'diff',
  '--exit-code',
  '--',
  'src/theme.ts',
  'src/generated/designTokens.ts',
  'src/generated/design-tokens.css',
  'ios-native/PadelNative/Theme/GeneratedDesignTokens.swift'
]);

console.log('Design tokens are in sync for web and iOS.');

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
