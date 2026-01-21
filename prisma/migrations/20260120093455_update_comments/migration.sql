-- Prisma Database Comments Generator v1.4.0

-- User comments
COMMENT ON COLUMN "User"."employee_id" IS 'Azure AD Employee ID';
COMMENT ON COLUMN "User"."company_name" IS 'Company name associated with user';
COMMENT ON COLUMN "User"."employee_type" IS 'Employee type (Full-time, Contractor, etc.)';
COMMENT ON COLUMN "User"."hire_date" IS 'Date of hire';
COMMENT ON COLUMN "User"."manager" IS 'Manager''s display name';
COMMENT ON COLUMN "User"."manager_email" IS 'Manager''s email address';
COMMENT ON COLUMN "User"."sam_account_name" IS 'SAM Account Name (legacy)';
COMMENT ON COLUMN "User"."contact_info" IS 'Detailed contact info (JSON)';
COMMENT ON COLUMN "User"."deleted_from_ad" IS 'Whether user is deleted from Azure AD';
COMMENT ON COLUMN "User"."failed_login_attempts" IS 'Number of failed login attempts';
COMMENT ON COLUMN "User"."locked_until" IS 'Timestamp until which account is locked';
COMMENT ON COLUMN "User"."last_failed_login" IS 'Timestamp of last failed login';
COMMENT ON COLUMN "User"."two_factor_enabled" IS 'Whether 2FA is enabled';
COMMENT ON COLUMN "User"."two_factor_method" IS '2FA method (totp, email)';
COMMENT ON COLUMN "User"."two_factor_secret" IS 'Encrypted 2FA secret';
COMMENT ON COLUMN "User"."two_factor_backup_codes" IS 'Encrypted backup codes';
COMMENT ON COLUMN "User"."two_factor_verified_at" IS 'Timestamp of 2FA verification';
