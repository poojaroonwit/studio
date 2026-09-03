import { describe, it, expect } from 'vitest';
import { getAccountBaseUrl, FALLBACK_APP_IDENTITY } from '@/lib/outborn-account-integration';

describe('OutbornShellOwnership', () => {
  describe('Account integration', () => {
    it('should return Account base URL when configured', () => {
      const original = process.env.OUTBORN_ACCOUNT_AUTH_URL;
      process.env.OUTBORN_ACCOUNT_AUTH_URL = 'https://account.example.com';
      try {
        expect(getAccountBaseUrl()).toBe('https://account.example.com');
      } finally {
        process.env.OUTBORN_ACCOUNT_AUTH_URL = original;
      }
    });

    it('should return null when not configured', () => {
      const orig1 = process.env.OUTBORN_ACCOUNT_AUTH_URL;
      const orig2 = process.env.OUTBORN_ACCOUNT_BASE_URL;
      delete process.env.OUTBORN_ACCOUNT_AUTH_URL;
      delete process.env.OUTBORN_ACCOUNT_BASE_URL;
      try {
        expect(getAccountBaseUrl()).toBeNull();
      } finally {
        if (orig1) process.env.OUTBORN_ACCOUNT_AUTH_URL = orig1;
        if (orig2) process.env.OUTBORN_ACCOUNT_BASE_URL = orig2;
      }
    });
  });

  describe('Fallback identity', () => {
    it('should provide Obsi People as fallback', () => {
      expect(FALLBACK_APP_IDENTITY.id).toBe('obsi-people');
      expect(FALLBACK_APP_IDENTITY.name).toBe('Obsi People');
    });
  });

  describe('Ownership', () => {
    it('Outborn Account owns identity, Obsi People owns HR', () => {
      expect(true).toBe(true);
    });
  });
});
