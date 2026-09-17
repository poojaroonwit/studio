module.exports = {
  expo: {
    name: 'Obsi People ESS',
    slug: 'obsi-people-ess',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'obsipeopleess',
    userInterfaceStyle: 'automatic',
    android: {
      package: 'co.outborn.people.ess',
      googleServicesFile: './google-services.json',
      adaptiveIcon: { backgroundColor: '#ffffff' },
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION']
    },
    ios: {
      bundleIdentifier: 'co.outborn.people.ess',
      googleServicesFile: process.env.EXPO_IOS_GOOGLE_SERVICES_FILE || undefined
    },
    plugins: [
      '@react-native-firebase/app',
      '@react-native-firebase/analytics',
      ['expo-secure-store', { configureAndroidBackup: false }],
      ['expo-location', { locationWhenInUsePermission: 'Allow Obsi People ESS to use your location when you clock in or out.' }]
    ],
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_HRIVE_API_URL || 'https://people.outborn.co',
      accountUrl: process.env.EXPO_PUBLIC_OUTBORN_ACCOUNT_URL || 'https://account.outborn.co',
      accountClientId: process.env.EXPO_PUBLIC_OUTBORN_ACCOUNT_CLIENT_ID || 'obsi-people-ess-mobile',
      redirectUri: process.env.EXPO_PUBLIC_OUTBORN_ACCOUNT_REDIRECT_URI || 'https://people.outborn.co/mobile/oauth/callback'
    }
  }
}
