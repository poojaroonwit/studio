const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const mobileRoot = path.join(root, 'mobile');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[native-mobile] ${message}`);
  }
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

for (const dependency of ['@capacitor/core', '@capacitor/ios', '@capacitor/android']) {
  assert(mobilePackage.dependencies?.[dependency], `${dependency} must be installed`);
}

for (const platform of ['ios', 'android']) {
  assert(
    mobilePackage.scripts?.[`native:open:${platform}`],
    `missing native:open:${platform} script`,
  );
}

for (const relativePath of ['mobile/www/index.html', 'mobile/scripts/prepare-native.mjs']) {
  assert(fs.existsSync(path.join(root, relativePath)), `missing ${relativePath}`);
}

assert(fs.existsSync(mobileRoot), 'mobile workspace is missing');
console.log('Native mobile architecture checks passed.');
