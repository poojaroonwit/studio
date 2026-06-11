import { CredentialsSignin } from 'next-auth';

export class TwoFactorRequiredError extends CredentialsSignin {
  code = 'TWO_FACTOR_REQUIRED';

  constructor(method: string) {
    super(`TWO_FACTOR_REQUIRED:${method}`);
    this.code = `TWO_FACTOR_REQUIRED:${method}`;
  }
}

export class AccountDisabledError extends CredentialsSignin {
  constructor() {
    super('Your account is disabled');
    this.code = 'ACCOUNT_DISABLED';
  }
}

export class AccountLockedError extends CredentialsSignin {
  constructor() {
    super('Your account is locked');
    this.code = 'ACCOUNT_LOCKED';
  }
}
