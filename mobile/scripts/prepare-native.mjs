import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requested = (process.env.NATIVE_PLATFORM || 'ios,android')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
const platforms = [...new Set(requested.filter((value) => value === 'ios' || value === 'android'))];
if (!platforms.length) throw new Error('NATIVE_PLATFORM must include ios and/or android');

const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: mobileRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run('node', ['scripts/prepare-assets.mjs']);

for (const platform of platforms) {
  if (!existsSync(path.join(mobileRoot, platform))) {
    run('npx', ['cap', 'add', platform]);
  }
  run('npx', ['cap', 'sync', platform]);
}

run('npx', [
  '@capacitor/assets',
  'generate',
  '--iconBackgroundColor', '#ffffff',
  '--iconBackgroundColorDark', '#111827',
  '--splashBackgroundColor', '#ffffff',
  '--splashBackgroundColorDark', '#111827',
]);
run('node', ['scripts/configure-generated-native.mjs']);
for (const platform of platforms) run('npx', ['cap', 'sync', platform]);
run('node', ['scripts/configure-generated-native.mjs']);

console.log(`\nNative Hrive projects ready: ${platforms.join(', ')}.`);
if (platforms.includes('ios')) console.log('iOS: npm run native:open:ios');
if (platforms.includes('android')) console.log('Android: npm run native:open:android');
