# Database Setup Guide

This guide explains how to check your existing database schema and set up the application to work with your current database configuration.

## Quick Start

### 1. Check Your Current Database Schema

First, let's see what's already in your database:

```bash
npm run db:check
```

This will show you:
- Existing tables in your database
- Missing required tables
- Whether admin user, positions, and stages exist
- What actions are needed

### 2. Set Up Environment Variables

Copy the production template and update it with your values:

```bash
cp env.production.template .env.local
```

Your current environment variables are already correct:
```bash
DATABASE_URL=postgresql://postgres:secure_password@postgres:5432/studio5_production
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=studio5_production
```

### 3. Run Database Setup

Based on the schema check results:

**If tables are missing:**
```bash
npx prisma migrate deploy
```

**If data is missing:**
```bash
npx prisma db seed
```

**Or run the complete setup:**
```bash
npm run db:setup
```

## Environment Variables

The application now uses these environment variables for database configuration:

### Required Database Variables
```bash
DATABASE_URL=postgresql://postgres:secure_password@postgres:5432/studio5_production
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=studio5_production
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
```

### Optional Database Configuration
```bash
DATABASE_SSL=false
DATABASE_MAX_CONNECTIONS=10
DATABASE_IDLE_TIMEOUT=30000
DATABASE_CONNECTION_TIMEOUT=2000
```

## Database Schema

The application expects these tables:

### Core Tables
- **User** - Application users and authentication
- **Candidate** - Job candidates and their data
- **Position** - Job positions and requirements
- **RecruitmentStage** - Stages in the hiring process

### Supporting Tables
- **TransitionRecord** - History of candidate stage changes
- **JobMatch** - AI-generated job matches for candidates
- **LogEntry** - Application logs and audit trail
- **UserGroup** - User groups and permissions
- **User_UserGroup** - Many-to-many relationship between users and groups

### Additional Tables
- **UploadQueue** - File upload processing queue
- **ResumeHistory** - Resume upload history
- **NotificationEvent** - Notification event definitions
- **NotificationChannel** - Notification channels (email, webhook)
- **NotificationSetting** - User notification preferences
- **CustomFieldDefinition** - Custom field definitions
- **SystemSetting** - System configuration settings
- **WebhookFieldMapping** - Webhook payload field mappings
- **AuditLog** - Audit trail
- **Account** - OAuth account connections
- **DataModel** - Data model definitions
- **SystemPreference** - System preferences
- **UserUIDisplayPreference** - User UI display preferences

## Checking Database Status

### Manual Database Check

Connect to your PostgreSQL database and run:

```sql
-- Check existing tables
\dt

-- Check if admin user exists
SELECT * FROM "User" WHERE email = 'admin@ncc.com';

-- Check if positions exist
SELECT * FROM "Position";

-- Check if recruitment stages exist
SELECT * FROM "RecruitmentStage";

-- Check table counts
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes
FROM pg_stat_user_tables
ORDER BY tablename;
```

### Using the Schema Check Script

```bash
npm run db:check
```

This script will:
1. Connect to your database using `DATABASE_URL`
2. List all existing tables
3. Check for required tables
4. Verify if admin user exists
5. Check if positions and stages exist
6. Provide specific recommendations

## Troubleshooting

### Common Issues

**1. "Error Loading Candidate" or "Error fetching candidate"**
- Run `npm run db:check` to see what's missing
- Ensure all required tables exist
- Verify admin user exists

**2. Database connection errors**
- Check `DATABASE_URL` format
- Ensure PostgreSQL is running
- Verify database exists

**3. Permission errors**
- Ensure the `postgres` user has full access
- Check if database exists: `studio5_production`

**4. Missing tables**
- Run: `npx prisma migrate deploy`
- This creates all required tables

**5. Missing data**
- Run: `npx prisma db seed`
- This creates admin user, positions, and stages

### Database Reset (if needed)

If you need to start fresh:

```bash
# Drop and recreate everything
npx prisma migrate reset

# Or manually drop tables and re-run setup
npx prisma migrate deploy
npx prisma db seed
```

## Migration from Existing Schema

If you have an existing database with different table names or structure:

1. **Check current schema:**
   ```bash
   npm run db:check
   ```

2. **Backup existing data:**
   ```bash
   pg_dump -h postgres -U postgres -d studio5_production > backup.sql
   ```

3. **Run migrations:**
   ```bash
   npx prisma migrate deploy
   ```

4. **Seed initial data:**
   ```bash
   npx prisma db seed
   ```

5. **Migrate existing data** (if needed):
   - Create a custom migration script
   - Map existing data to new schema
   - Run the migration script

## Verification

After setup, verify everything works:

1. **Start the application:**
   ```bash
   npm run dev
   ```

2. **Access the application:**
   - URL: http://10.0.10.71:8021
   - Login: `admin@ncc.com` / `nccadmin`

3. **Test candidate functionality:**
   - Navigate to Candidates page
   - Try to view candidate details
   - Check if "Error Loading Candidate" is resolved

## Support

If you encounter issues:

1. Run `npm run db:check` for detailed diagnostics
2. Check application logs for specific error messages
3. Verify all environment variables are set correctly
4. Ensure all required services (PostgreSQL, MinIO, Redis) are running

For additional help, refer to the main README.md file or create an issue with the output from `npm run db:check`. 