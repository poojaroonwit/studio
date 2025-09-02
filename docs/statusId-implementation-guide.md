# StatusId Implementation Guide

## Overview

This guide explains how to implement the `statusId` field rename for the Candidate table while avoiding deployment failures.

## What We've Implemented

### 1. **Prisma Schema Updated**
- ✅ Field renamed from `status` → `statusId`
- ✅ Relation mapping updated to use `statusId`
- ✅ Index updated to use `statusId`

### 2. **TypeScript Types Updated**
- ✅ `Candidate` interface uses `statusId` field
- ✅ All type definitions are consistent

### 3. **Database Migration Created**
- ✅ `20250128000007_deployment_safe_rename` migration
- ✅ Safely renames column from `status` → `statusId`
- ✅ Handles constraints and indexes properly

### 4. **Dockerfile Updated**
- ✅ Removed `npx prisma generate` from build time
- ✅ Prisma client generation moved to runtime

### 5. **Entrypoint Script Updated**
- ✅ Runs migration before Prisma client generation
- ✅ Ensures database is ready before schema operations

## How It Works

### **Phase 1: Build Time**
1. Docker builds without Prisma client generation
2. No database connection required during build
3. Build succeeds regardless of database state

### **Phase 2: Runtime (Entrypoint)**
1. Container starts and connects to database
2. Runs migration to rename `status` → `statusId`
3. Generates Prisma client with updated schema
4. Starts application with proper client

## Deployment Process

### **1. Build and Deploy**
```bash
docker-compose up --build
```

### **2. What Happens During Deployment**
- ✅ Container builds successfully
- ✅ No Prisma generation errors
- ✅ Migration runs automatically
- ✅ Column renamed to `statusId`
- ✅ Prisma client generated successfully

### **3. After Deployment**
- ✅ Database uses `statusId` column
- ✅ All code uses `statusId` field
- ✅ Status displays as stage names (not UUIDs)
- ✅ Foreign key constraints work properly

## Files Modified

- `prisma/schema.prisma` - Field renamed to `statusId`
- `src/lib/types.ts` - Interface updated to use `statusId`
- `Dockerfile` - Prisma generation moved to runtime
- `entrypoint.sh` - Migration and client generation logic
- `prisma/migrations/20250128000007_deployment_safe_rename/` - Column rename migration

## Verification

After deployment, verify:

1. **Database Column**: `status` → `statusId`
2. **Prisma Client**: Generated successfully
3. **Application**: Starts without errors
4. **Status Display**: Shows stage names instead of UUIDs

## Troubleshooting

### **If Migration Fails**
- Check database connection
- Verify migration file exists
- Check database permissions

### **If Prisma Generation Fails**
- Ensure migration completed successfully
- Check schema syntax
- Verify database schema matches Prisma schema

## Benefits

- ✅ **No Deployment Failures** - Build succeeds regardless of database state
- ✅ **Automatic Migration** - Column rename happens automatically
- ✅ **Consistent Naming** - All code uses `statusId`
- ✅ **Data Integrity** - Foreign key constraints maintained
- ✅ **Zero Downtime** - Migration runs during container startup

## Next Steps

After successful deployment:

1. **Update Components**: Run `npm run update:all-to-statusId` to update any remaining references
2. **Test Functionality**: Verify status display works correctly
3. **Monitor Logs**: Check for any migration or generation issues
4. **Clean Up**: Remove old migration files if no longer needed
