const AZURE_AD_ERROR_CODES = new Set([
  'OAuthSignin',
  'OAuthCallback',
  'OAuthCreateAccount',
  'EmailCreateAccount',
  'Callback',
  'OAuthAccountNotLinked',
  'EmailSignin',
  'SessionRequired',
]);

export function getSignInErrorMessage(errorParam: string | null) {
  if (!errorParam) return '';

  if (
    errorParam === 'CredentialsSignin'
    || errorParam === 'Configuration'
  ) {
    return 'Invalid email or password. Please try again.';
  }

  if (errorParam === 'SessionExpired') {
    return 'Your session has expired. Please sign in again.';
  }

  if (AZURE_AD_ERROR_CODES.has(errorParam)) {
    return 'There was an error signing in with Azure AD. Please try again or contact support.';
  }

  return decodeURIComponent(errorParam);
}
