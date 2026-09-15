const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const nativeRoutes = read('mobile/src/essRoutes.ts');
const mobilePaths = new Set(
  [...nativeRoutes.matchAll(/path:\s*'([^']+)'/g)].map((match) => match[1]),
);

const essDirectory = path.join(root, 'src/app/ess');
const webEssRoutes = fs.readdirSync(essDirectory, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({
    route: `/ess/${entry.name}`,
    pagePath: path.join(essDirectory, entry.name, 'page.tsx'),
  }))
  .filter(({ pagePath }) => fs.existsSync(pagePath))
  .map(({ route }) => route)
  .sort();

for (const route of webEssRoutes) {
  assert(
    mobilePaths.has(route),
    `Native ESS navigation is missing web route ${route}`,
  );
}

assert(mobilePaths.has('/employee-portal'), 'Native ESS navigation must include /employee-portal');
assert(mobilePaths.has('/my-workday'), 'Native ESS navigation must include /my-workday escape route');

const webMobileNav = read('src/components/layout/MobileBottomNav.tsx');
const webEssHrefs = new Set(
  [...webMobileNav.matchAll(/href:\s*['"](\/ess\/[^'"]+)['"]/g)].map((match) => match[1]),
);
for (const route of webEssHrefs) {
  assert(mobilePaths.has(route), `Native ESS navigation drifted from web mobile nav: ${route}`);
}

const appConfig = read('mobile/app.config.ts');
assert(appConfig.includes("bundleIdentifier: 'co.outborn.hrive'"), 'iOS bundle identifier drifted');
assert(appConfig.includes("package: 'co.outborn.hrive'"), 'Android package identifier drifted');
assert(appConfig.includes("scheme: 'hrive'"), 'Native deep-link scheme must remain hrive://');
assert(appConfig.includes("applinks:people.outborn.co"), 'iOS associated domain is missing');

const nativeConfig = read('mobile/src/config.ts');
const nativeDetector = read('src/lib/native-mobile.ts');
assert(nativeConfig.includes("localStorage.setItem('hrive-native-app', '1')"), 'Native shell must mark local storage');
assert(nativeDetector.includes("HRIVE_NATIVE_STORAGE_KEY = 'hrive-native-app'"), 'Web/native marker keys drifted');
assert(nativeDetector.includes("HRIVE_NATIVE_USER_AGENT_TOKEN = 'HriveNative/'"), 'Native user-agent detection drifted');

const layout = read('src/app/layout.tsx');
assert(layout.includes('<NativeAwareMobileBottomNav />'), 'Root layout must use native-aware mobile navigation');

const pwaFeatures = read('src/components/pwa/PWAClientFeatures.tsx');
assert(pwaFeatures.includes('useHriveNativeShell'), 'PWA features must be disabled inside the native shell');

assert(fs.existsSync(path.join(root, 'src/app/.well-known/apple-app-site-association/route.ts')), 'iOS association route is missing');
assert(fs.existsSync(path.join(root, 'src/app/.well-known/assetlinks.json/route.ts')), 'Android association route is missing');

console.log(`Native mobile regression checks passed for ${webEssRoutes.length} ESS routes.`);
