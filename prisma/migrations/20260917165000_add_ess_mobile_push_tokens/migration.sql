CREATE TABLE IF NOT EXISTS hr_mobile_push_tokens (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform varchar(16) NOT NULL,
  device_name varchar(180),
  app_version varchar(40),
  enabled boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hr_mobile_push_tokens_user_idx
  ON hr_mobile_push_tokens (user_id, enabled, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS hr_mobile_push_tokens_employee_idx
  ON hr_mobile_push_tokens (employee_id, enabled, last_seen_at DESC);
