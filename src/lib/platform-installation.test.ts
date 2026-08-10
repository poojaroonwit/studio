import { describe, expect, it } from 'vitest';

import { firstAdminSetupSchema } from './platform-installation';

describe('first admin setup input', () => {
  it('normalizes a valid first admin account', () => {
    const result = firstAdminSetupSchema.parse({
      name: '  Nara Admin  ',
      email: 'NARA@EXAMPLE.COM',
      password: 'SecurePass1!',
      confirmPassword: 'SecurePass1!',
    });

    expect(result.name).toBe('Nara Admin');
    expect(result.email).toBe('nara@example.com');
  });

  it('rejects mismatched passwords', () => {
    const result = firstAdminSetupSchema.safeParse({
      name: 'Nara Admin',
      email: 'nara@example.com',
      password: 'SecurePass1!',
      confirmPassword: 'DifferentPass1!',
    });

    expect(result.success).toBe(false);
  });
});
