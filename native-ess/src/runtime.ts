import Constants from 'expo-constants'
import { Platform } from 'react-native'

const version = Constants.expoConfig?.version || '0.0.0'
const nativeBuild = Platform.OS === 'ios'
  ? Constants.expoConfig?.ios?.buildNumber
  : Constants.expoConfig?.android?.versionCode

export const appBuildLabel = `Version ${version}${nativeBuild ? ` · Build ${nativeBuild}` : ''}${__DEV__ ? ' · Development' : ''}`
