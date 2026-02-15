import { spawn } from 'node:child_process';

// Note for non-coders: this script re-generates permission copy files and fails if Git sees differences.
await run('node', ['scripts/generate-permission-capability-matrix.mjs']);
await run('git', [
  'diff',
  '--exit-code',
  '--',
  'src/shared/permissionCapabilityMatrix.ts',
  'ios-native/PadelNative/Models/SharedPermissionsState.swift'
]);

console.log('Permission capability matrix files are in sync for web and iOS.');

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
