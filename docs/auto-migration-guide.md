# Auto-Migration Guide

## Overview

The Studio application now uses an **automatic migration system** that detects and handles database migrations for both new deployments and upgrades without any manual configuration.

## How It Works

The system automatically detects three scenarios:

### 1. 🆕 **Fresh Database** (New Deployment)
- Detects when no migrations table exists
- Creates initial migration automatically
- Seeds the database with initial data

### 2. 📦 **Pending Migrations** (Upgrade)
- Detects when there are unapplied migrations
- Applies all pending migrations automatically
- Maintains database consistency

### 3. 🔧 **Schema Out of Sync** (Development)
- Detects when schema differs from database
- Syncs schema automatically (for development/testing)
- Handles schema drift gracefully

## Usage

### For New Deployments
```bash
# Just run the application - it will handle everything automatically
npm run start

# Or manually trigger auto-migration
npm run db:auto
```

### For Upgrades
```bash
# Deploy new version - migrations are applied automatically
docker-compose up -d

# Or manually trigger auto-migration
npm run db:auto
```

### For Development
```bash
# Create new migration
npm run db:dev -- --name add_new_feature

# Auto-migration will handle the rest
npm run db:auto
```

## What Happens Automatically

1. **Database Connection Check** - Verifies database is accessible
2. **State Detection** - Determines if fresh, pending, or out of sync
3. **Migration Application** - Applies appropriate migrations
4. **Database Seeding** - Seeds initial data if needed
5. **Final Validation** - Ensures everything is working

## Environment Variables

The system works with minimal configuration:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Required | Database connection string |
| `DB_MAX_WAIT_SECONDS` | `60` | Max time to wait for database |
| `DB_WAIT_INTERVAL` | `5` | Interval between connection attempts |

## Commands

### Primary Commands
```bash
# Auto-migration (recommended)
npm run db:auto

# Standard migration (same as auto)
npm run db:migrate

# Check migration status
npm run db:status

# Open Prisma Studio
npm run db:studio
```

### Development Commands
```bash
# Create new migration
npm run db:dev -- --name descriptive_name

# Reset database (development only)
npm run db:reset

# Deploy existing migrations
npm run db:deploy
```

### Validation Commands
```bash
# Validate migrations
npm run db:validate

# Force validation
npm run db:validate:force
```

## Deployment Scenarios

### Scenario 1: New Production Deployment
```bash
# 1. Set up database
# 2. Deploy application
docker-compose up -d

# The entrypoint script automatically:
# ✅ Detects fresh database
# ✅ Creates initial migration
# ✅ Seeds database
# ✅ Starts application
```

### Scenario 2: Application Upgrade
```bash
# 1. Deploy new version
docker-compose up -d

# The entrypoint script automatically:
# ✅ Detects pending migrations
# ✅ Applies all migrations
# ✅ Seeds if needed
# ✅ Starts application
```

### Scenario 3: Development Environment
```bash
# 1. Make schema changes
# 2. Create migration
npm run db:dev -- --name add_new_table

# 3. Auto-migration handles the rest
npm run db:auto
```

## Troubleshooting

### Database Connection Issues
```bash
# Check connection
npx prisma db execute --stdin <<< "SELECT 1;"

# Verify DATABASE_URL
echo $DATABASE_URL
```

### Migration Issues
```bash
# Check status
npm run db:status

# Manual migration
npm run db:deploy

# Reset (development only)
npm run db:reset
```

### Schema Sync Issues
```bash
# Force schema sync
npx prisma db push --accept-data-loss

# Check differences
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma
```

## Benefits

### ✅ **Zero Configuration**
- No environment variables needed
- No manual migration commands
- Works out of the box

### ✅ **Automatic Detection**
- Detects fresh vs existing databases
- Identifies pending migrations
- Handles schema drift

### ✅ **Safe Operations**
- Validates before applying
- Handles errors gracefully
- Provides clear feedback

### ✅ **Development Friendly**
- Works in all environments
- Supports rapid iteration
- Maintains data integrity

## Migration Best Practices

### For Developers
1. **Create descriptive migrations**:
   ```bash
   npm run db:dev -- --name add_user_preferences_table
   ```

2. **Test locally first**:
   ```bash
   npm run db:auto
   ```

3. **Commit migration files**:
   ```bash
   git add prisma/migrations/
   git commit -m "Add user preferences table"
   ```

### For Deployment
1. **No manual steps required** - just deploy
2. **Automatic migration handling** - entrypoint script does everything
3. **Safe upgrades** - migrations are applied automatically

## Example Workflow

### Development Workflow
```bash
# 1. Make schema changes in prisma/schema.prisma
# 2. Create migration
npm run db:dev -- --name add_new_feature

# 3. Test locally
npm run db:auto

# 4. Commit and push
git add .
git commit -m "Add new feature"
git push
```

### Production Deployment
```bash
# 1. Deploy (no manual steps needed)
docker-compose up -d

# 2. Monitor logs
docker-compose logs -f app

# 3. Verify deployment
curl http://localhost:8021/api/health
```

## Conclusion

The auto-migration system provides:
- **Simplicity** - No manual configuration needed
- **Reliability** - Automatic detection and handling
- **Safety** - Proper validation and error handling
- **Flexibility** - Works for all deployment scenarios

Just deploy your application and let the system handle the rest! 🚀
