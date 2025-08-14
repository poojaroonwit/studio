# Migration Workflow Guide

## Overview

This guide explains the complete migration workflow for the Studio application, from development to production deployment, using the improved migration system with best practices.

## Migration Workflow Steps

### 1. **Development Phase**

#### Create a New Migration
```bash
# Create a new migration with descriptive name
npx prisma migrate dev --name create_user_preferences_table

# Review the generated SQL before applying
npx prisma migrate dev --create-only --name add_foreign_key_constraint
```

#### Validate Migration Before Committing
```bash
# Validate migration follows best practices
npm run db:validate

# Force validation if needed
npm run db:validate:force

# Skip schema validation if needed
npm run db:validate:skip-schema
```

#### Test Migration Locally
```bash
# Apply migration to development database
npm run db:dev

# Check migration status
npm run db:status

# Reset if needed (WARNING: This deletes all data)
npm run db:reset
```

### 2. **Staging Phase**

#### Deploy to Staging
```bash
# Deploy migrations to staging
npm run db:deploy

# Validate staging database
npm run db:validate

# Check application functionality
npm run test
```

#### Environment Variables for Staging
```bash
# Staging environment variables
RUN_MIGRATIONS=true
VALIDATE_MIGRATIONS=true
REMOVE_MIGRATION_FILES=false
FORCE_CONTINUE=false
MIGRATION_TIMEOUT=600
```

### 3. **Production Phase**

#### Pre-Production Checklist
- [ ] All migrations validated (`npm run db:validate`)
- [ ] Staging deployment successful
- [ ] Application tests passing
- [ ] Database backup completed
- [ ] Maintenance window scheduled
- [ ] Rollback plan prepared

#### Production Deployment
```bash
# Production environment variables
RUN_MIGRATIONS=true
VALIDATE_MIGRATIONS=true
REMOVE_MIGRATION_FILES=true
FORCE_CONTINUE=false
MIGRATION_TIMEOUT=900
```

#### Monitor Deployment
```bash
# Check migration logs
docker logs <container-name> | grep -i migration

# Verify database schema
npm run db:status

# Monitor application performance
# Check application logs for errors
```

## Environment Variables Reference

### Migration Control Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RUN_MIGRATIONS` | `false` | Enable/disable migration execution |
| `VALIDATE_MIGRATIONS` | `true` | Enable/disable migration validation |
| `REMOVE_MIGRATION_FILES` | `false` | Remove migration files after deployment |
| `FORCE_CONTINUE` | `true` | Continue despite failures |
| `MIGRATION_TIMEOUT` | `300` | Migration execution timeout (seconds) |

### Database Connection Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_MAX_WAIT_SECONDS` | `60` | Maximum time to wait for database |
| `DB_WAIT_INTERVAL` | `5` | Interval between connection attempts |

## Migration Scripts Reference

### Core Migration Scripts

```bash
# Standard migration (recommended)
npm run db:migrate

# Force migration despite validation failures
npm run db:migrate:force

# Skip migrations entirely
npm run db:migrate:skip

# Validate migrations only
npm run db:validate

# Development commands
npm run db:dev          # Create and apply migration
npm run db:deploy       # Deploy existing migrations
npm run db:reset        # Reset database (development only)
npm run db:status       # Check migration status
npm run db:studio       # Open Prisma Studio
```

### PowerShell Commands (Windows)

```powershell
# Windows PowerShell versions
npm run db:migrate:ps
npm run db:migrate:ps:force
npm run db:setup:ps
```

## Migration Validation Rules

### Naming Convention
- Format: `YYYYMMDDHHMMSS_descriptive_action_name.sql`
- Must include descriptive verbs: `create`, `add`, `modify`, `remove`, `migrate`
- Avoid generic names: `update`, `change`, `fix`

### SQL Best Practices
- ✅ Include proper indexes for frequently queried columns
- ✅ Add foreign key constraints with cascade options
- ✅ Use proper default values for UUID and TIMESTAMP columns
- ✅ Document rollback steps in comments
- ❌ Avoid large migrations (>100 lines)
- ❌ Avoid dangerous operations without proper safeguards

### Validation Checks
- Migration naming convention
- SQL syntax validation
- Prisma schema consistency
- Database connection status
- Migration status verification

## Troubleshooting

### Common Issues

#### 1. **Migration Validation Fails**
```bash
# Check specific validation errors
npm run db:validate

# Force validation to see all issues
npm run db:validate:force

# Fix naming convention issues
# Rename migration files to follow pattern: YYYYMMDDHHMMSS_descriptive_name.sql
```

#### 2. **Database Connection Issues**
```bash
# Check database connection
npx prisma db execute --stdin <<< "SELECT 1;"

# Verify DATABASE_URL environment variable
echo $DATABASE_URL

# Check database server status
# Verify network connectivity
```

#### 3. **Migration Timeout**
```bash
# Increase timeout for large migrations
export MIGRATION_TIMEOUT=1800  # 30 minutes

# Check for long-running queries
# Monitor database performance during migration
```

#### 4. **Schema Sync Issues**
```bash
# Check migration status
npm run db:status

# Reset if needed (development only)
npm run db:reset

# Manual schema sync
npx prisma db push --accept-data-loss
```

### Emergency Procedures

#### Rollback Migration
```bash
# If migration fails, rollback manually
npx prisma migrate resolve --rolled-back <migration_name>

# Restore from backup if needed
pg_restore -d $DATABASE_URL backup_file.sql
```

#### Force Continue
```bash
# Set environment variable to continue despite failures
export FORCE_CONTINUE=true

# Restart application
docker-compose restart app
```

## Best Practices Summary

### Development
1. **Create atomic migrations** - One logical change per migration
2. **Use descriptive names** - Follow naming convention
3. **Validate before committing** - Run validation script
4. **Test locally first** - Use development database
5. **Document rollback steps** - Include in migration comments

### Staging
1. **Test with production-like data** - Use realistic data volumes
2. **Validate performance impact** - Monitor query performance
3. **Test application functionality** - Ensure features work correctly
4. **Prepare rollback plan** - Document rollback procedures

### Production
1. **Schedule maintenance windows** - Plan for downtime
2. **Backup database first** - Always have a backup
3. **Monitor deployment** - Watch logs and metrics
4. **Validate post-deployment** - Check application health
5. **Have rollback ready** - Be prepared to rollback if needed

## Monitoring and Alerting

### Key Metrics to Monitor
- Migration execution time
- Database connection status
- Application error rates
- Database query performance
- Schema consistency status

### Alert Conditions
- Migration failures
- Database connection timeouts
- Schema sync issues
- Application errors after migration
- Performance degradation

## Security Considerations

### Database Access
- Use least privilege principle for database users
- Rotate database credentials regularly
- Use connection pooling for production
- Monitor database access logs

### Migration Security
- Validate migration files before deployment
- Use secure channels for database connections
- Audit migration changes
- Implement proper access controls

## Conclusion

Following this migration workflow ensures:
- **Reliability**: Consistent and safe migrations
- **Maintainability**: Clear and documented processes
- **Safety**: Proper validation and rollback procedures
- **Monitoring**: Visibility into migration status and impact

Remember: Database migrations are critical operations that can affect your entire application. Always prioritize safety, testing, and proper planning over speed.
