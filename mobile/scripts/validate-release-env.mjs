const platform = process.argv[2] || process.env.NATIVE_RELEASE_PLATFORM || 'all';

const requirements = {
  android: [
    'ANDROID_KEYSTORE_BASE64',
    'ANDROID_KEYSTORE_PASSWORD',
    'ANDROID_KEY_ALIAS',
    'ANDROID_KEY_PASSWORD',
    'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON',
    'GOOGLE_SERVICES_JSON_BASE64',
  ],
  ios: [
    'APPLE_TEAM_ID',
    'APPLE_DISTRIBUTION_CERTIFICATE_BASE64',
    'APPLE_DISTRIBUTION_CERTIFICATE_PASSWORD',
    'APPLE_PROVISIONING_PROFILE_BASE64',
    'APPLE_PROVISIONING_PROFILE_NAME',
    'APP_STORE_CONNECT_API_KEY_ID',
    'APP_STORE_CONNECT_ISSUER_ID',
    'APP_STORE_CONNECT_API_KEY_BASE64',
  ],
};

const selected = platform === 'all' ? ['android', 'ios'] : [platform];
const missing = selected.flatMap((target) =>
  (requirements[target] || []).filter((name) => !process.env[name]?.trim()),
);

if (missing.length) {
  console.error(`Missing native release secrets: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`Native ${selected.join(' + ')} release environment is configured.`);
