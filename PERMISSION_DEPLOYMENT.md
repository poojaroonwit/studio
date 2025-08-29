# Permission Reset and Deployment Scripts

This document explains the comprehensive permission reset and deployment system that ensures all user roles have the correct granular permissions instead of invalid broad permissions.

## Overview

The permission system has been updated to use granular permissions instead of broad, invalid permissions like `CANDIDATES_MANAGE`, `POSITIONS_MANAGE`, etc. This provides better security and more precise access control.

## Scripts Overview

### 1. Permission Reset Script (`scripts/reset-permissions.js`)

**Purpose**: Resets all user group permissions to use the correct granular permissions.

**Features**:
- Validates all permissions against the `PLATFORM_MODULES` list
- Replaces invalid broad permissions with granular ones
- Supports Admin, Recruiter, and Hiring Manager roles
- Handles custom user groups by removing invalid permissions
- Provides detailed logging and verification

**Usage**:
```bash
# Run permission reset
npm run reset:permissions

# Or directly
node scripts/reset-permissions.js
```

### 2. Full Deployment Script (`scripts/deploy-with-permissions.js`)

**Purpose**: Complete deployment process including permission reset.

**Steps**:
1. Database connection check
2. Database migrations
3. Permission reset and validation
4. Database seeding
5. Application build
6. Health checks

**Usage**:
```bash
# Run full deployment
npm run deploy:full

# Or directly
node scripts/deploy-with-permissions.js
```

### 3. Docker Deployment Scripts

#### Bash Version (`scripts/docker-deploy-with-permissions.sh`)
**Usage**:
```bash
# Full deployment
npm run deploy:docker

# Specific actions
./scripts/docker-deploy-with-permissions.sh --migrate
./scripts/docker-deploy-with-permissions.sh --permissions
./scripts/docker-deploy-with-permissions.sh --seed
./scripts/docker-deploy-with-permissions.sh --build
./scripts/docker-deploy-with-permissions.sh --start
```

#### PowerShell Version (`scripts/docker-deploy-with-permissions.ps1`)
**Usage**:
```powershell
# Full deployment
npm run deploy:docker:ps

# Specific actions
.\scripts\docker-deploy-with-permissions.ps1 -Action migrate
.\scripts\docker-deploy-with-permissions.ps1 -Action permissions
.\scripts\docker-deploy-with-permissions.ps1 -Action seed
.\scripts\docker-deploy-with-permissions.ps1 -Action build
.\scripts\docker-deploy-with-permissions.ps1 -Action start
```

### 4. Entrypoint Script (`entrypoint.sh`)

**Purpose**: Automatic permission setup during Docker container startup.

**Features**:
- Comprehensive permission setup and validation
- Three-step process:
  1. Fix permission alignment
  2. Reset permissions to granular format
  3. Verify permission integrity
- Non-blocking (continues deployment even if permission setup has warnings)

## Permission Mapping

### Admin Role
Full access to all granular permissions:
- All candidate permissions (view, create, edit, delete, etc.)
- All position permissions (view, create, edit, delete, etc.)
- All user management permissions
- All system settings permissions
- All other permissions (reports, logs, etc.)

### Recruiter Role
Limited access focused on candidate and position management:
- Basic candidate operations (view, create, edit basic, source assign, etc.)
- Basic position operations (view, create, edit basic, etc.)
- Task board management (own tasks)
- Dashboard and reports access
- User preferences (own)

### Hiring Manager Role
Read-only access:
- View candidates and positions
- View comments
- Access dashboard
- Manage own user preferences

## Invalid Permissions Removed

The following broad permissions are automatically replaced with granular ones:
- `CANDIDATES_MANAGE` → Individual candidate permissions
- `POSITIONS_MANAGE` → Individual position permissions
- `USERS_MANAGE` → Individual user management permissions
- `USER_GROUPS_MANAGE` → Individual user group permissions
- `SYSTEM_SETTINGS_MANAGE` → Individual system settings permissions

## Deployment Process

### Automatic Deployment (Docker)
When using Docker, the entrypoint script automatically:
1. Runs database migrations
2. Seeds the database
3. Sets up comprehensive permissions
4. Starts the application

### Manual Deployment
For manual deployments, use the appropriate script:

```bash
# For local development
npm run deploy:full

# For Docker (Linux/Mac)
npm run deploy:docker

# For Docker (Windows)
npm run deploy:docker:ps
```

## Verification

All scripts include verification steps to ensure:
- All permissions are valid
- No invalid permissions remain
- Role assignments are correct
- Database integrity is maintained

## Troubleshooting

### Permission Reset Issues
If permission reset fails:
1. Check database connection
2. Verify `PLATFORM_MODULES` is up to date
3. Check for custom user groups with invalid permissions
4. Review logs for specific error messages

### Deployment Issues
If deployment fails:
1. Check Docker status (for Docker deployments)
2. Verify database connectivity
3. Check migration status
4. Review application logs

### Common Commands
```bash
# Check permission status
npm run reset:permissions

# Check deployment status
npm run health-check

# View logs
docker-compose logs -f

# Restart application
docker-compose restart
```

## Security Benefits

The granular permission system provides:
- **Principle of Least Privilege**: Users only get the permissions they need
- **Better Audit Trail**: Specific permissions make it easier to track access
- **Reduced Risk**: No broad permissions that could grant unintended access
- **Compliance**: Easier to demonstrate compliance with security requirements

## Migration Notes

When upgrading from older versions:
1. The permission reset will automatically run during deployment
2. Existing user groups will be updated with granular permissions
3. Custom user groups will have invalid permissions removed
4. No data loss occurs during the permission update

## Support

For issues with permission reset or deployment:
1. Check the logs for specific error messages
2. Verify all scripts are up to date
3. Ensure database connectivity
4. Review the troubleshooting section above
