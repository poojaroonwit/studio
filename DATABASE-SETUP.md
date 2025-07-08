# Database Setup Guide

This guide explains how to set up the database using the `postgres` user instead of the default `studio_user`.

## Prerequisites

- PostgreSQL running (via Docker or local installation)
- Node.js and npm installed
- Your environment variables configured

## Environment Configuration

Your environment should include these database-related variables:

```bash
DATABASE_URL=postgresql://postgres:secure_password@postgres:5432/studio5_production
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=studio5_production
POSTGRES_HOST=postgres
POSTGRES_PORT=8521
```

## Quick Setup

### Option 1: Using the Setup Script (Recommended)

**Windows (PowerShell):**
```powershell
npm run db:setup:ps
```

**Cross-platform (Node.js):**
```bash
npm run db:setup
```

### Option 2: Manual Setup

1. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

2. **Run database migrations:**
   ```bash
   npx prisma migrate deploy
   ```

3. **Seed the database:**
   ```bash
   npx prisma db seed
   ```

## What the Setup Does

1. **Creates database tables** based on the Prisma schema
2. **Seeds initial data** including:
   - Admin user (admin@ncc.com / nccadmin)
   - Default positions (Software Engineer, Product Manager)
   - Recruitment stages (Applied, Screening, Shortlisted, etc.)
   - User groups (Admin, Recruiter, Hiring Manager)
   - Notification channels and events

## Verification

After setup, you should be able to:

1. **Start the application:**
   ```bash
   npm run dev
   ```

2. **Access the application** at: http://10.0.10.71:8021

3. **Login with default credentials:**
   - Email: `admin@ncc.com`
   - Password: `nccadmin`

## Troubleshooting

### Common Issues

**1. "Error Loading Candidate" or "Error fetching candidate"**
- Ensure the database setup completed successfully
- Check that all tables were created
- Verify the admin user exists

**2. Database connection errors**
- Verify PostgreSQL is running
- Check DATABASE_URL format
- Ensure the database exists

**3. Permission errors**
- The `postgres` user should have full access to the database
- If using Docker, ensure the database container is running

### Manual Database Verification

Connect to your PostgreSQL database and run:

```sql
-- Check if tables exist
\dt

-- Check if admin user exists
SELECT * FROM "User" WHERE email = 'admin@ncc.com';

-- Check if positions exist
SELECT * FROM "Position";

-- Check if recruitment stages exist
SELECT * FROM "RecruitmentStage";
```

### Reset Database (if needed)

If you need to start fresh:

```bash
# Drop and recreate the database
npx prisma migrate reset

# Or manually drop tables and re-run setup
npx prisma migrate deploy
npx prisma db seed
```

## Database Schema

The application creates these main tables:

- **User** - Application users and authentication
- **Candidate** - Job candidates and their data
- **Position** - Job positions and requirements
- **RecruitmentStage** - Stages in the hiring process
- **TransitionRecord** - History of candidate stage changes
- **JobMatch** - AI-generated job matches for candidates
- **LogEntry** - Application logs and audit trail

## Support

If you encounter issues:

1. Check the application logs for detailed error messages
2. Verify your environment variables are correct
3. Ensure all required services (PostgreSQL, MinIO, Redis) are running
4. Try the troubleshooting steps above

For additional help, refer to the main README.md file. 