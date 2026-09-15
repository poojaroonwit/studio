import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(mobileRoot, '..');
const assetDir = path.join(mobileRoot, 'assets');
const sourceIcon = path.join(repoRoot, 'public', 'icon-512x512.png');

await mkdir(assetDir, { recursive: true });

const iconBuffer = await sharp(sourceIcon)
  .resize(1024, 1024, { fit: 'contain', background: '#ffffff' })
  .png()
  .toBuffer();

await sharp(iconBuffer).toFile(path.join(assetDir, 'icon.png'));
await sharp(iconBuffer).toFile(path.join(assetDir, 'logo.png'));

const splashLogo = await sharp(sourceIcon)
  .resize(720, 720, { fit: 'contain' })
  .png()
  .toBuffer();

await sharp({
  create: {
    width: 2732,
    height: 2732,
    channels: 4,
    background: '#ffffff',
  },
})
  .composite([{ input: splashLogo, gravity: 'centre' }])
  .png()
  .toFile(path.join(assetDir, 'splash.png'));

await sharp({
  create: {
    width: 2732,
    height: 2732,
    channels: 4,
    background: '#111827',
  },
})
  .composite([{ input: splashLogo, gravity: 'centre' }])
  .png()
  .toFile(path.join(assetDir, 'splash-dark.png'));

console.log('Prepared native icon and splash source assets.');
