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
    table_exists "User" && \
        table_exists "SystemSetting" && \
        table_exists "LogEntry" && \
        table_exists "broadcast_campaigns" && \
        table_exists "hr_payroll_groups" && \
        table_exists "hr_payroll_exceptions" && \
        table_exists "employee_advances"
}

deploy_checked_in_migrations() {
    echo "Ensuring required PostgreSQL extensions..."
    npx prisma db execute --schema=prisma/schema.prisma \
      --file=scripts/ensure-postgresql-extensions.sql || {
        echo "ERROR: PostgreSQL extension bootstrap failed"
        exit 1
      }

    echo "Applying checked-in Prisma migrations..."
    if npx prisma migrate deploy --schema=prisma/schema.prisma; then
        echo "Checked-in database migrations applied successfully"
        return 0
    fi

    echo "ERROR: Prisma migrate deploy failed; the application will not start with an uncertain schema"
    exit 1
}

prepare_database() {
    wait_for_database

    if [ "${SKIP_MIGRATIONS:-false}" = "true" ]; then
        echo "SKIP_MIGRATIONS=true - leaving schema changes to the deployment pipeline"
    else
        deploy_checked_in_migrations
    fi

    if ! has_required_tables; then
        echo "ERROR: required tables are missing. Apply the checked-in migrations before starting the application."
        exit 1
    fi
}

seed_database() {
    if [ "${SKIP_SEED:-true}" != "false" ]; then
        echo "Skipping seed; set SKIP_SEED=false to seed explicitly"
        return 0
    fi

    echo "Seeding database..."
    if npx prisma db seed; then
        echo "Database seed completed"
        return 0
    fi

    echo "ERROR: database seed was explicitly requested but failed"
    exit 1
}

prepare_database
if npx prisma db execute --schema=prisma/schema.prisma --file=scripts/ensure-system-recruitment-stages.sql; then
    echo "Required recruitment stages ensured"
else
    echo "ERROR: required recruitment stages could not be ensured"
    exit 1
fi
seed_database

start_main_application
