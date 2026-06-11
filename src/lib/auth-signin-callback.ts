import { getResolvedAzureAdSettings } from '@/lib/auth-azure-ad-settings';
import { handleAzureAdSignIn } from '@/lib/auth-azure-ad-signin';
import type { SignInCallbackInput } from './auth-callback-types';

export async function handleSignInCallback({
  user,
  account,
  profile,
}: SignInCallbackInput) {
  const currentAzureAdSettings = await getResolvedAzureAdSettings();
  return handleAzureAdSignIn({
    user: user as unknown as Record<string, unknown>,
    account: account as unknown as Record<string, unknown> | null | undefined,
    profile: profile as unknown as Record<string, unknown> | null | undefined,
    isAzureAdConfigured: currentAzureAdSettings.isConfigured,
  });
}
