import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: new URL('..', import.meta.url),
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

if (!existsSync(new URL('../ios', import.meta.url))) {
  run('npx', ['cap', 'add', 'ios']);
}

if (!existsSync(new URL('../android', import.meta.url))) {
  run('npx', ['cap', 'add', 'android']);
}

run('npx', ['cap', 'sync']);

console.log('\nNative Hrive projects are ready.');
console.log('iOS: npm run native:open:ios');
console.log('Android: npm run native:open:android');
