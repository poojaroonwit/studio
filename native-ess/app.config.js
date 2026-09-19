module.exports = {
  expo: {
    name: 'Obsi People ESS',
    slug: 'obsi-people-ess',
    version: '0.2.0',
    orientation: 'portrait',
    scheme: 'obsipeopleess',
    userInterfaceStyle: 'light',
    android: {
      package: 'co.outborn.people.ess',
      versionCode: 2,
      googleServicesFile: './google-services.json',
      adaptiveIcon: { backgroundColor: '#F6F7F9' },
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'POST_NOTIFICATIONS']
    },
    ios: {
      bundleIdentifier: 'co.outborn.people.ess',
      buildNumber: '2',
      googleServicesFile: process.env.EXPO_IOS_GOOGLE_SERVICES_FILE || undefined,
      infoPlist: {
        UIUserInterfaceStyle: 'Light'
      }
    },
    plugins: [
      '@react-native-firebase/app',
      '@react-native-firebase/analytics',
      ['expo-secure-store', { configureAndroidBackup: false }],
      ['expo-local-authentication', { faceIDPermission: 'Allow Obsi People ESS to use Face ID to protect your employee information.' }],
      ['expo-location', { locationWhenInUsePermission: 'Allow Obsi People ESS to use your location when your organization requires location verification for clock in or clock out.' }],
      ['expo-image-picker', {
        cameraPermission: 'Allow Obsi People ESS to use your camera to attach a photo to an HR conversation.',
        photosPermission: 'Allow Obsi People ESS to access photos you choose to share with HR.',
        microphonePermission: false
      }]
    ],
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_HRIVE_API_URL || 'https://people.outborn.co',
      accountUrl: process.env.EXPO_PUBLIC_OUTBORN_ACCOUNT_URL || 'https://account.outborn.co',
      accountClientId: process.env.EXPO_PUBLIC_OUTBORN_ACCOUNT_CLIENT_ID || 'obsi-people-ess-mobile',
      redirectUri: process.env.EXPO_PUBLIC_OUTBORN_ACCOUNT_REDIRECT_URI || 'https://people.outborn.co/mobile/oauth/callback',
      releaseStage: 'development'
    }
  }
}
