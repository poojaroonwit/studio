import { handleOutbornAccountSignIn } from '@/lib/auth-outborn-account-signin';
import type { SignInCallbackInput } from './auth-callback-types';

export async function handleSignInCallback(input: SignInCallbackInput) {
  if (input.account?.provider !== 'outborn-account') {
    return false;
  }

  return handleOutbornAccountSignIn(input);
}
