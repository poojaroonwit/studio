# Unnecessary Scripts Report

This report identifies unnecessary, duplicate, or missing scripts in the project.

## 🔴 Critical Issues - Missing Scripts Referenced in package.json

These npm scripts reference files that don't exist:

1. **`debug:connections`** (line 45)
   - References: `scripts/debug-connection-usage.js`
   - Status: ❌ File does not exist
   - Action: Remove from package.json or create the missing file

2. **`test:container-metrics`** (line 46)
   - References: `scripts/test-container-metrics.js`
   - Status: ❌ File does not exist
   - Action: Remove from package.json or create the missing file

## 🟡 Duplicate Scripts

These scripts have duplicate functionality:

1. **`start:custom`** and **`start`** (lines 13-14)
   - Both use: `node server.js`
   - Recommendation: Remove `start:custom` as it's identical to `start`

2. **`db:migrate:force`** and **`db:migrate`** (lines 27-28)
   - Both use: `prisma migrate deploy --schema=prisma/schema.prisma`
   - Recommendation: Remove `db:migrate:force` as it's identical to `db:migrate`

## 🟠 Useless Scripts

1. **`optimize`** (line 26)
   - Content: `echo Optimization script not available`
   - Status: Does nothing useful
   - Recommendation: Remove or implement actual optimization

## 🟢 Unused Scripts in scripts/ Directory

These scripts exist but are never referenced in package.json or other files:

1. **`scripts/create-example-data.js`**
   - Status: Not referenced anywhere
   - Recommendation: Remove if not needed, or add to package.json if useful

2. **`scripts/debug-user-permissions.js`**
   - Status: Not referenced anywhere
   - Recommendation: Remove if not needed, or add to package.json if useful

3. **`scripts/fix-admin-permissions.js`**
   - Status: Not referenced anywhere
   - Recommendation: Remove if not needed, or add to package.json if useful

4. **`scripts/fix-permission-alignment.js`**
   - Status: Not referenced (there's a TypeScript version in `src/scripts/fix-permission-alignment.ts`)
   - Recommendation: Remove if the TypeScript version is preferred

5. **`scripts/force-session-refresh.js`**
   - Status: Not referenced anywhere
   - Recommendation: Remove if not needed, or add to package.json if useful

6. **`scripts/test-auto-security.js`**
   - Status: Not referenced in package.json
   - Recommendation: Remove if not needed, or add to package.json if useful

7. **`scripts/secure-minio-bucket.js`**
   - Status: Not referenced in package.json
   - Recommendation: Remove if not needed, or add to package.json if useful

8. **`scripts/secure-production-bucket.js`**
   - Status: Not referenced in package.json
   - Recommendation: Remove if not needed, or add to package.json if useful

9. **`scripts/apply-security-fix.js`**
   - Status: Not referenced in package.json
   - Recommendation: Remove if not needed, or add to package.json if useful

10. **`scripts/configure-minio-cors.js`**
    - Status: Not referenced anywhere
    - Recommendation: Remove if not needed, or add to package.json if useful

## 📋 SQL Scripts (Documentation Only)

These SQL scripts are only referenced in documentation:

1. **`scripts/analyze-index-usage.sql`**
2. **`scripts/optimize-indexes.sql`**
3. **`scripts/validate-index-removal.sql`**

- Status: Only mentioned in `docs/index-optimization-analysis.md`
- Recommendation: Keep if they're useful for manual database optimization, otherwise remove

## ✅ Scripts That Are Used (Keep These)

These scripts are actively used and should be kept:

### Critical - Part of Migration/Deployment Process:
- `entrypoint.sh` - Used in Dockerfile (runs migrations automatically)
- `entrypoint-processor.sh` - Used in docker-compose.yml and k8s
- `scripts/initialize-warning-conditions.cjs` - **USED IN entrypoint.sh line 253** - Part of deployment migration!
- `scripts/update-components-to-statusId.js` (fix:status-rename) - **USED IN entrypoint.sh line 262** - Part of deployment migration!

### Application Scripts:
- `server.js` - Used by start scripts
- `start-local.js` - Used for local development
- `scripts/process-upload-queue.cjs` - Used by processor
- `scripts/start-production.cjs` - Used by start:production
- `scripts/run-migrations-and-seed.sh` - Used by db:migrate:seed

### Utility Scripts (Referenced in package.json):
- `scripts/fix-stage-mismatches.js` - Used by fix:stages
- `scripts/fix-candidate-status-uuid.js` - Used by fix:candidate-status
- `scripts/skip-failed-migrations.js` - Used by migrations:skip-failed
- `scripts/create-admin-user.js` - Used by db:create-admin
- `scripts/seed-upload-queue.js` - Used by seed:upload-queue
- `scripts/seed-demo-data.ts` - Used by seed:demo-data
- `scripts/setup-local-dev.js` - Used by setup:local
- `scripts/manage-system-settings.js` - Used by settings:* commands
- All other scripts referenced in package.json (except the missing ones above)

## ⚠️ IMPORTANT: Scripts Part of Migration Process

**DO NOT REMOVE** these scripts as they are automatically executed during deployment:

1. **`scripts/initialize-warning-conditions.cjs`**
   - Called in `entrypoint.sh` line 253
   - Runs after database seeding during deployment
   - **Status: ✅ KEEP - Part of migration process**

2. **`scripts/update-components-to-statusId.js`** (npm script: `fix:status-rename`)
   - Called in `entrypoint.sh` line 262
   - Runs after database seeding during deployment
   - **Status: ✅ KEEP - Part of migration process**

## 📝 Recommended Actions

### Immediate Actions (Safe to Remove):
1. ✅ Remove or fix the two missing script references in package.json:
   - `debug:connections` → `scripts/debug-connection-usage.js` (doesn't exist)
   - `test:container-metrics` → `scripts/test-container-metrics.js` (doesn't exist)
2. ✅ Remove duplicate scripts:
   - `start:custom` (identical to `start`)
   - `db:migrate:force` (identical to `db:migrate`)
3. ✅ Remove the useless `optimize` script (just echoes a message)

### Optional Cleanup (Review First):
1. Review unused scripts in scripts/ directory (listed above)
2. Either add them to package.json if useful, or remove them
3. Consider consolidating duplicate functionality (e.g., permission fix scripts)

### ⚠️ Files to Review Before Deletion:
- Check git history to see if any unused scripts were recently used
- Check if any scripts are used in CI/CD pipelines
- Verify with team if any scripts are used manually
- **DO NOT remove scripts that are part of the migration process** (see above)

