#!/bin/sh

set -u

case "${NODE_ENV:-production}" in
    production|development|test)
        export NODE_ENV=${NODE_ENV:-production}
        ;;
    *)
        echo "Non-standard NODE_ENV='${NODE_ENV}' detected; using NODE_ENV=production"
        export NODE_ENV=production
        ;;
esac
export PORT=${PORT:-8021}

start_main_application() {
    if [ "${NODE_ENV:-production}" != "production" ]; then
        echo "Forcing NODE_ENV=production for next start"
    fi

    export NODE_ENV=production
    echo "Starting main application..."
    exec npm run start
}

if [ "${SKIP_MIGRATIONS:-false}" = "true" ]; then
    echo "SKIP_MIGRATIONS=true - skipping database migrations"
    start_main_application
fi

if [ -z "${DATABASE_URL:-}" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

mask_database_url() {
    echo "$DATABASE_URL" | sed 's/:[^:@]*@/:***@/'
}

wait_for_database() {
    echo "Waiting for database: $(mask_database_url)"

    DB_MAX_WAIT_SECONDS=${DB_MAX_WAIT_SECONDS:-90}
    DB_WAIT_INTERVAL=${DB_WAIT_INTERVAL:-5}
    ELAPSED=0

    while [ "$ELAPSED" -lt "$DB_MAX_WAIT_SECONDS" ]; do
        if pg_isready -d "$DATABASE_URL" >/dev/null 2>&1; then
            echo "Database connection verified"
            return 0
        fi

        sleep "$DB_WAIT_INTERVAL"
        ELAPSED=$((ELAPSED + DB_WAIT_INTERVAL))
        echo "Waiting for database... ${ELAPSED}/${DB_MAX_WAIT_SECONDS}s"
    done

    echo "ERROR: Database not ready after ${DB_MAX_WAIT_SECONDS}s"
    exit 1
}

table_exists() {
    TABLE_NAME=$1
    EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT to_regclass('public.\"${TABLE_NAME}\"') IS NOT NULL;" 2>/dev/null | xargs || echo "f")
    [ "$EXISTS" = "t" ]
}

has_required_tables() {
    table_exists "User" && table_exists "SystemSetting" && table_exists "LogEntry"
}

has_prisma_migrations_table() {
    table_exists "_prisma_migrations"
}

sync_schema_with_prisma() {
    echo "Syncing database schema from prisma/schema.prisma..."
    if npx prisma db push --accept-data-loss --skip-generate --schema=prisma/schema.prisma; then
        echo "Database schema synced"
        resolve_failed_migrations_after_schema_sync
        return 0
    fi

    echo "ERROR: prisma db push failed"
    exit 1
}

resolve_failed_migrations_after_schema_sync() {
    if [ "${AUTO_RESOLVE_FAILED_MIGRATIONS:-true}" != "true" ]; then
        echo "AUTO_RESOLVE_FAILED_MIGRATIONS is not true - leaving failed Prisma migrations unchanged"
        return 0
    fi

    if ! has_prisma_migrations_table; then
        return 0
    fi

    FAILED_MIGRATIONS=$(psql "$DATABASE_URL" -t -A -c "SELECT migration_name FROM \"_prisma_migrations\" WHERE finished_at IS NULL AND rolled_back_at IS NULL ORDER BY started_at;" 2>/dev/null || true)
    if [ -z "$FAILED_MIGRATIONS" ]; then
        return 0
    fi

    echo "Resolving failed Prisma migrations after schema sync..."
    echo "$FAILED_MIGRATIONS" | while IFS= read -r MIGRATION_NAME; do
        if [ -n "$MIGRATION_NAME" ]; then
            echo "Marking migration as applied: $MIGRATION_NAME"
            npx prisma migrate resolve --applied "$MIGRATION_NAME" --schema=prisma/schema.prisma || {
                echo "Warning: unable to resolve failed migration $MIGRATION_NAME"
            }
        fi
    done
}

deploy_migrations() {
    echo "Applying Prisma migrations..."
    if npx prisma migrate deploy --schema=prisma/schema.prisma; then
        echo "Prisma migrations applied"
        return 0
    fi

    echo "Prisma migrate deploy failed; falling back to schema sync"
    sync_schema_with_prisma
}

prepare_database() {
    wait_for_database

    if ! has_prisma_migrations_table; then
        echo "Fresh database detected"
        sync_schema_with_prisma
    else
        deploy_migrations
    fi

    if ! has_required_tables; then
        echo "Required tables are missing after migration step"
        sync_schema_with_prisma
    fi
}

seed_database() {
    if [ "${SKIP_SEED:-false}" = "true" ]; then
        echo "SKIP_SEED=true - skipping seed"
        return 0
    fi

    echo "Seeding database..."
    if npx prisma db seed; then
        echo "Database seed completed"
        return 0
    fi

    echo "Seed failed, continuing without seed data"
}

prepare_database
seed_database

start_main_application
