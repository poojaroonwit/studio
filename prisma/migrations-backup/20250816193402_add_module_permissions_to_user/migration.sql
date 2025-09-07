-- AlterTable (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'module_permissions'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "module_permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
END$$;

DO $$
BEGIN
  -- Only set default if it's not already CURRENT_TIMESTAMP
  IF NOT EXISTS (
    SELECT 1
    FROM pg_attrdef d
    JOIN pg_class c ON c.oid = d.adrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.adnum
    WHERE n.nspname = 'public' AND c.relname = 'UserTeam' AND a.attname = 'updatedAt'
      AND pg_get_expr(d.adbin, d.adrelid) ILIKE '%now()%'
  ) THEN
    ALTER TABLE "UserTeam" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
  END IF;
END$$;
