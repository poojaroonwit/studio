#!/bin/sh

export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-8021}

if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "Using local Docker bootstrap entrypoint"
echo "Waiting for database to be ready..."

DB_MAX_WAIT_SECONDS=${DB_MAX_WAIT_SECONDS:-60}
DB_WAIT_INTERVAL=${DB_WAIT_INTERVAL:-5}
ELAPSED=0

while [ "$ELAPSED" -lt "$DB_MAX_WAIT_SECONDS" ]; do
    if pg_isready -d "$DATABASE_URL"; then
        break
    fi
    sleep "$DB_WAIT_INTERVAL"
    ELAPSED=$((ELAPSED + DB_WAIT_INTERVAL))
    echo "Waiting for database... ${ELAPSED}/${DB_MAX_WAIT_SECONDS}s"
done

if ! pg_isready -d "$DATABASE_URL" >/dev/null 2>&1; then
    echo "ERROR: Database not ready after ${DB_MAX_WAIT_SECONDS}s"
    exit 1
fi

echo "Syncing schema from prisma/schema.prisma..."
if npx prisma db execute --skip-generate --schema=prisma/schema.prisma \
  --file=scripts/ensure-postgresql-extensions.sql; then
    echo "PostgreSQL extensions are ready"
else
    echo "Warning: extension bootstrap failed; attempting schema sync anyway"
fi

echo "Deduplicating service desk knowledge documents by (category_id, file_name)..."
if npx prisma db execute --skip-generate --schema=prisma/schema.prisma \
  --file=scripts/dedupe-service-desk-knowledge-documents.sql; then
    echo "Knowledge documents dedupe completed"
else
    echo "Warning: duplicate cleanup failed; schema sync may still fail if duplicates remain"
fi

if npx prisma db push --skip-generate --accept-data-loss --schema=prisma/schema.prisma; then
    echo "Database schema is ready"
else
    echo "ERROR: safe Prisma schema sync failed; existing data was not reset"
    exit 1
fi

echo "Backfilling legacy position organization links..."
npx prisma db execute --schema=prisma/schema.prisma --file=scripts/backfill-position-organization-units.sql || \
  echo "Warning: position organization backfill failed; unresolved positions will remain blocked from headcount requests."
npx tsx scripts/report-unresolved-position-organization-links.ts || \
  echo "Warning: unresolved position organization report failed."

if npx prisma db execute --schema=prisma/schema.prisma --file=scripts/ensure-system-recruitment-stages.sql; then
    echo "Required recruitment stages ensured"
else
    echo "ERROR: required recruitment stages could not be ensured"
    exit 1
fi

if [ "${SKIP_SEED:-true}" != "false" ]; then
    echo "Skipping seed; set SKIP_SEED=false to seed explicitly"
else
    echo "Seeding database..."
    if npx prisma db seed; then
        echo "Database seed completed"
    else
        echo "Seed failed, continuing without seed data"
    fi
fi

echo "Starting main application..."
exec npm run start
