import { describe, expect, it } from 'vitest';

import { getSignInErrorMessage } from './signin-error-utils';

describe('getSignInErrorMessage', () => {
  it('returns an empty message when no error is present', () => {
    expect(getSignInErrorMessage(null)).toBe('');
  });

  it('normalizes credential errors', () => {
    expect(getSignInErrorMessage('CredentialsSignin')).toBe('Invalid email or password. Please try again.');
    expect(getSignInErrorMessage('Configuration')).toBe('Invalid email or password. Please try again.');
  });

  it('maps session and Azure AD errors to friendly messages', () => {
    expect(getSignInErrorMessage('SessionExpired')).toBe('Your session has expired. Please sign in again.');
    expect(getSignInErrorMessage('OAuthCallback')).toBe('There was an error signing in with Azure AD. Please try again or contact support.');
  });

  it('decodes unknown error messages', () => {
    expect(getSignInErrorMessage('Custom%20failure')).toBe('Custom failure');
  });
});
