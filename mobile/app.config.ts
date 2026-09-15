import type { ConfigContext, ExpoConfig } from 'expo/config';

const productionBaseUrl = 'https://people.outborn.co';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Hrive ESS',
  slug: 'hrive-ess',
  version: '1.0.0',
  scheme: 'hrive',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: '../public/icon-512x512.png',
  ios: {
    ...config.ios,
    bundleIdentifier: 'co.outborn.hrive',
    supportsTablet: true,
    associatedDomains: ['applinks:people.outborn.co'],
  },
  android: {
    ...config.android,
    package: 'co.outborn.hrive',
    icon: '../public/icon-512x512.png',
    predictiveBackGestureEnabled: true,
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        category: ['BROWSABLE', 'DEFAULT'],
        data: [
          { scheme: 'https', host: 'people.outborn.co', pathPrefix: '/employee-portal' },
          { scheme: 'https', host: 'people.outborn.co', pathPrefix: '/ess' },
        ],
      },
    ],
  },
  extra: {
    ...config.extra,
    hriveBaseUrl: process.env.EXPO_PUBLIC_HRIVE_BASE_URL || productionBaseUrl,
  },
});
