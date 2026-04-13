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

echo "Syncing schema with prisma db push..."
if npx prisma db push --accept-data-loss --skip-generate --schema=prisma/schema.prisma; then
    echo "Database schema is ready"
else
    echo "ERROR: prisma db push failed"
    exit 1
fi

if [ "${SKIP_SEED:-false}" = "true" ]; then
    echo "Skipping seed because SKIP_SEED=true"
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
