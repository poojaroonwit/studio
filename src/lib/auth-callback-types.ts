import type { Account, Profile, Session, User } from 'next-auth';
import type { AdapterUser } from 'next-auth/adapters';
import type { JWT } from 'next-auth/jwt';

export type MutableAuthToken = JWT & Record<string, unknown> & {
  id?: string;
  role?: string;
  name?: string | null;
  avatarUrl?: string | null;
  personalColor?: string | null;
  twoFactorEnabled?: boolean;
  twoFactorMethod?: 'email' | 'totp';
  isMobile?: boolean;
  sessionToken?: string;
  impersonatedUserId?: string;
  impersonatedRole?: string;
  impersonatedName?: string;
  adminId?: string;
  outbornAccountAccessToken?: string;
  outbornAccountAccessTokenExpiresAt?: number;
  outbornAccountRefreshToken?: string;
  outbornAccountTokenError?: string;
  exp?: number;
};

export type AuthCallbackUser = (User | AdapterUser) & {
  id?: string;
  role?: string;
  isMobile?: boolean;
  sessionToken?: string;
};

export type AzureAdProfile = Profile & {
  oid?: string | null;
  sub?: string | null;
  email?: string | null;
};

export type AuthDbUser = Record<string, unknown> & {
  id: string;
  name?: string | null;
  role?: string | null;
  isActive?: boolean;
};

export interface JwtCallbackInput {
  token: MutableAuthToken;
  user?: AuthCallbackUser | null;
  account?: Account | null;
  profile?: AzureAdProfile | null;
  trigger?: 'signIn' | 'signUp' | 'update';
  session?: unknown;
}

export interface SessionCallbackInput {
  session: Session;
  token: MutableAuthToken;
}

export interface SignInCallbackInput {
  user: AuthCallbackUser;
  account?: Account | null;
  profile?: AzureAdProfile;
  email?: { verificationRequest?: boolean };
  credentials?: Record<string, unknown>;
}
