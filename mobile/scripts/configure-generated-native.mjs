import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(path.join(mobileRoot, 'package.json'), 'utf8'));
const versionName = process.env.NATIVE_VERSION_NAME || packageJson.version;
const buildNumber = String(process.env.NATIVE_BUILD_NUMBER || process.env.GITHUB_RUN_NUMBER || '1');
const versionCode = Number.parseInt(buildNumber.replace(/\D/g, '').slice(-9), 10) || 1;

const ensureBefore = (file, anchor, content) => {
  if (!existsSync(file)) return;
  const current = readFileSync(file, 'utf8');
  if (current.includes(content.trim())) return;
  if (!current.includes(anchor)) throw new Error(`Unable to find ${anchor} in ${file}`);
  writeFileSync(file, current.replace(anchor, `${content}\n${anchor}`));
};

const xmlEscape = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

function configureIos() {
  const appDir = path.join(mobileRoot, 'ios', 'App', 'App');
  const infoPlist = path.join(appDir, 'Info.plist');
  const appDelegate = path.join(appDir, 'AppDelegate.swift');
  const projectFile = path.join(mobileRoot, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
  if (!existsSync(infoPlist) || !existsSync(projectFile)) return;

  const infoEntries = `\t<key>NSFaceIDUsageDescription</key>\n\t<string>Use Face ID to unlock your Hrive employee self-service session.</string>\n\t<key>NSCameraUsageDescription</key>\n\t<string>Use the camera to attach receipts, documents, and profile images in Hrive.</string>\n\t<key>NSPhotoLibraryUsageDescription</key>\n\t<string>Select photos and documents to attach to Hrive employee requests.</string>\n\t<key>NSPhotoLibraryAddUsageDescription</key>\n\t<string>Save Hrive documents and images when you choose to export them.</string>\n\t<key>CFBundleURLTypes</key>\n\t<array>\n\t\t<dict>\n\t\t\t<key>CFBundleURLName</key>\n\t\t\t<string>co.outborn.people</string>\n\t\t\t<key>CFBundleURLSchemes</key>\n\t\t\t<array><string>hrive</string></array>\n\t\t</dict>\n\t</array>`;
  ensureBefore(infoPlist, '</dict>', infoEntries);

  if (existsSync(appDelegate)) {
    const current = readFileSync(appDelegate, 'utf8');
    if (!current.includes('capacitorDidRegisterForRemoteNotifications')) {
      const insertion = `\n    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {\n        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)\n    }\n\n    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {\n        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)\n    }\n`;
      const closingIndex = current.lastIndexOf('\n}');
      if (closingIndex < 0) throw new Error('Unable to patch iOS AppDelegate.swift');
      writeFileSync(appDelegate, `${current.slice(0, closingIndex)}${insertion}${current.slice(closingIndex)}`);
    }
  }

  const entitlementFile = path.join(appDir, 'App.entitlements');
  const apsEnvironment = process.env.APPLE_APS_ENVIRONMENT || 'development';
  writeFileSync(entitlementFile, `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n  <key>aps-environment</key>\n  <string>${xmlEscape(apsEnvironment)}</string>\n  <key>com.apple.developer.associated-domains</key>\n  <array>\n    <string>applinks:people.outborn.co</string>\n  </array>\n</dict>\n</plist>\n`);

  let project = readFileSync(projectFile, 'utf8');
  project = project.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${versionName};`);
  project = project.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${buildNumber};`);
  project = project.replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g, 'PRODUCT_BUNDLE_IDENTIFIER = co.outborn.people;');
  if (!project.includes('CODE_SIGN_ENTITLEMENTS = App/App.entitlements;')) {
    project = project.replace(/(CODE_SIGN_STYLE = Automatic;)/g, '$1\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;');
  }
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  if (teamId && !project.includes(`DEVELOPMENT_TEAM = ${teamId};`)) {
    project = project.replace(/(CODE_SIGN_STYLE = Automatic;)/g, `$1\n\t\t\t\tDEVELOPMENT_TEAM = ${teamId};`);
  }
  writeFileSync(projectFile, project);
}

function configureAndroid() {
  const manifest = path.join(mobileRoot, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  const gradle = path.join(mobileRoot, 'android', 'app', 'build.gradle');
  if (!existsSync(manifest) || !existsSync(gradle)) return;

  const permissions = `    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n    <uses-permission android:name="android.permission.CAMERA" />\n    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />`;
  ensureBefore(manifest, '<application', permissions);

  const intentFilters = `            <intent-filter android:autoVerify="true">\n                <action android:name="android.intent.action.VIEW" />\n                <category android:name="android.intent.category.DEFAULT" />\n                <category android:name="android.intent.category.BROWSABLE" />\n                <data android:scheme="https" android:host="people.outborn.co" android:pathPrefix="/employee-portal" />\n                <data android:scheme="https" android:host="people.outborn.co" android:pathPrefix="/ess" />\n            </intent-filter>\n            <intent-filter>\n                <action android:name="android.intent.action.VIEW" />\n                <category android:name="android.intent.category.DEFAULT" />\n                <category android:name="android.intent.category.BROWSABLE" />\n                <data android:scheme="hrive" />\n            </intent-filter>`;
  ensureBefore(manifest, '</activity>', intentFilters);

  let buildGradle = readFileSync(gradle, 'utf8');
  buildGradle = buildGradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  buildGradle = buildGradle.replace(/versionName\s+"[^"]+"/, `versionName "${versionName}"`);
  if (process.env.ANDROID_KEYSTORE_PATH && !buildGradle.includes('HRIVE_RELEASE_KEYSTORE')) {
    buildGradle = buildGradle.replace('android {', `android {\n    def HRIVE_RELEASE_KEYSTORE = System.getenv("ANDROID_KEYSTORE_PATH")\n    signingConfigs {\n        release {\n            storeFile HRIVE_RELEASE_KEYSTORE ? file(HRIVE_RELEASE_KEYSTORE) : null\n            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")\n            keyAlias System.getenv("ANDROID_KEY_ALIAS")\n            keyPassword System.getenv("ANDROID_KEY_PASSWORD")\n        }\n    }`);
    buildGradle = buildGradle.replace(/buildTypes \{\s*release \{/, 'buildTypes {\n        release {\n            signingConfig signingConfigs.release');
  }
  writeFileSync(gradle, buildGradle);

  const googleServices = process.env.GOOGLE_SERVICES_JSON_BASE64;
  if (googleServices) {
    writeFileSync(
      path.join(mobileRoot, 'android', 'app', 'google-services.json'),
      Buffer.from(googleServices, 'base64'),
    );
  }
}

configureIos();
configureAndroid();
console.log(`Configured generated native projects for Hrive ${versionName} (${buildNumber}).`);
