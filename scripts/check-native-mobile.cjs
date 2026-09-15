const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const mobileRoot = path.join(root, 'mobile');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(`[native-mobile] ${message}`);
}

const config = readJson('mobile/capacitor.config.json');
const mobilePackage = readJson('mobile/package.json');

assert(config.appId === 'co.outborn.people', 'Capacitor appId must remain co.outborn.people');
assert(config.appName === 'Hrive', 'Capacitor appName must remain Hrive');
assert(config.webDir === 'www', 'Capacitor webDir must remain mobile/www');
assert(
  typeof config.server?.url === 'string' && config.server.url.startsWith('https://'),
  'native server URL must use HTTPS',
);
assert(
  new URL(config.server.url).pathname.startsWith('/employee-portal'),
  'native app must launch into Employee Self Service',
);
assert(config.server.cleartext === false, 'cleartext traffic must stay disabled');
assert(config.android?.allowMixedContent === false, 'Android mixed content must stay disabled');
assert(config.android?.webContentsDebuggingEnabled === false, 'production WebView debugging must stay disabled');

for (const dependency of [
  '@capacitor/core', '@capacitor/ios', '@capacitor/android', '@capacitor/app',
  '@capacitor/network', '@capacitor/push-notifications', '@capacitor/camera',
  '@capacitor/filesystem', '@capacitor/share', '@capacitor/haptics',
  '@capacitor/status-bar', '@capacitor/splash-screen', '@capacitor/local-notifications',
  '@aparajita/capacitor-secure-storage', '@aparajita/capacitor-biometric-auth',
]) {
  assert(mobilePackage.dependencies?.[dependency], `${dependency} must be installed`);
}

for (const platform of ['ios', 'android']) {
  assert(mobilePackage.scripts?.[`native:open:${platform}`], `missing native:open:${platform} script`);
  assert(mobilePackage.scripts?.[`native:run:${platform}`], `missing native:run:${platform} script`);
}

for (const relativePath of [
  'mobile/www/index.html',
  'mobile/scripts/prepare-native.mjs',
  'mobile/scripts/prepare-assets.mjs',
  'mobile/scripts/configure-generated-native.mjs',
  'mobile/scripts/validate-release-env.mjs',
  'src/components/pwa/NativeMobileRuntime.tsx',
  'src/lib/native-mobile.ts',
  'src/lib/native-mobile-device-registry.ts',
  'src/lib/native-push.ts',
  'src/app/api/mobile/devices/route.ts',
  'src/app/ess/mobile-settings/page.tsx',
  'src/app/.well-known/assetlinks.json/route.ts',
  'src/app/.well-known/apple-app-site-association/route.ts',
  '.github/workflows/native-mobile.yml',
  '.github/workflows/native-release.yml',
]) {
  assert(fs.existsSync(path.join(root, relativePath)), `missing ${relativePath}`);
}

const runtime = read('src/components/pwa/NativeMobileRuntime.tsx');
for (const capability of [
  'PushNotifications', 'BiometricAuthNative', 'SecureStorage', 'networkStatusChange',
  'appUrlOpen', 'Camera', 'Filesystem', 'Share', 'Haptics', 'LocalNotifications',
  'flushOfflineQueue',
]) {
  assert(runtime.includes(capability), `native runtime is missing ${capability}`);
}

const releaseWorkflow = read('.github/workflows/native-release.yml');
assert(releaseWorkflow.includes('bundleRelease'), 'Android release must build an AAB');
assert(releaseWorkflow.includes('upload-google-play'), 'Android release must upload to Google Play');
assert(releaseWorkflow.includes('xcodebuild'), 'iOS release must archive with Xcode');
assert(releaseWorkflow.includes('altool --upload-app'), 'iOS release must upload to App Store Connect');

assert(fs.existsSync(mobileRoot), 'mobile workspace is missing');
console.log('Native mobile production architecture checks passed.');
