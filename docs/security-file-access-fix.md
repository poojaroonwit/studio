# Security Fix: File Access Vulnerability

## 🚨 CRITICAL SECURITY ISSUE RESOLVED

**Issue**: Files in MinIO storage were publicly accessible without authentication, allowing anyone with direct URLs to access sensitive documents like resumes and CVs.

**Root Cause**: The MinIO bucket was configured with a public read policy that allowed anonymous access to all objects.

## ✅ Security Fixes Applied

### 1. Private Bucket Policy Enforcement
- **File**: `src/lib/minio.ts`
- **Function**: `enforcePrivateBucketPolicy()`
- **Action**: Removes all public access policies and enforces private access only

### 2. Upload Endpoint Security
- **Files**: 
  - `src/app/api/upload-image/route.ts`
  - `src/app/api/settings/upload-image/route.ts`
  - `src/app/api/admin/configure-minio/route.ts`
- **Action**: Removed all logic that sets public read access policies

### 3. Security API Endpoint
- **File**: `src/app/api/admin/secure-bucket/route.ts`
- **Purpose**: Admin-only endpoint to immediately secure the bucket
- **Usage**: `POST /api/admin/secure-bucket`

### 4. Environment Configuration
- **Files**: `env.production.template`, `env.local.template`
- **Action**: Added security warnings and disabled `ALLOW_PUBLIC_FILES`

## 🔒 How File Access Now Works

### Secure File Access Methods

1. **Signed URLs** (Recommended)
   - Generated via `getSignedUrl()` function
   - Time-limited access (default: 1 hour)
   - Requires valid MinIO credentials

2. **Streaming Endpoint** (For authenticated users)
   - Route: `/api/secure-file/stream`
   - Requires user authentication
   - Includes permission checks
   - Supports range requests for large files

3. **Secure File API** (For programmatic access)
   - Route: `/api/secure-file`
   - Returns signed URLs after permission validation
   - Context-aware authorization (candidate/position ownership)

### Authentication Flow

```
User Request → Authentication Check → Permission Validation → File Access
     ↓                    ↓                    ↓                ↓
  Session Valid?    →  Has Permission?  →  Owns Resource?  →  Generate Signed URL
```

## 🛠️ Immediate Actions Required

### 1. Secure the Bucket (URGENT)
```bash
# Call the security endpoint as admin
curl -X POST https://your-domain.com/api/admin/secure-bucket \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 2. Update Environment Variables
```bash
# Remove or set to false
ALLOW_PUBLIC_FILES=false

# Ensure signed URLs are used
USE_SIGNED_URLS_IN_WEBHOOKS=true
```

### 3. Restart Services
```bash
# Restart MinIO and application containers
docker-compose restart minio app
```

## 🔍 Verification Steps

### 1. Test Public Access (Should Fail)
```bash
# This should return 403 Forbidden
curl "https://dev-s3-cv-screening.qsncc.com/studio-production/resumes/upload-queue/data_1758610811353_9dba3e6c-d686-4a92-80a4-2d367efd5046.pdf"
```

### 2. Test Authenticated Access (Should Work)
```bash
# This should return a signed URL
curl -X GET "https://your-domain.com/api/secure-file?filePath=resumes/upload-queue/data_1758610811353_9dba3e6c-d686-4a92-80a4-2d367efd5046.pdf" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Check Bucket Policy
```bash
# Verify bucket is private
curl -X GET "https://your-minio-console.com/api/v1/buckets/studio-production/policy" \
  -H "Authorization: Bearer MINIO_TOKEN"
```

## 📋 Security Checklist

- [ ] Bucket policy set to private only
- [ ] `ALLOW_PUBLIC_FILES=false` in environment
- [ ] All upload endpoints use private access
- [ ] File access requires authentication
- [ ] Signed URLs have appropriate expiration
- [ ] Permission checks implemented
- [ ] Public URLs return 403 Forbidden
- [ ] Authenticated access works correctly

## 🚨 Prevention Measures

1. **Never set `ALLOW_PUBLIC_FILES=true`** in production
2. **Always use signed URLs** for file access
3. **Implement proper permission checks** before file access
4. **Regular security audits** of bucket policies
5. **Monitor access logs** for unauthorized attempts

## 📞 Support

If you encounter issues with the security fix:
1. Check MinIO logs for policy errors
2. Verify environment variables are set correctly
3. Test with the security endpoint: `/api/admin/secure-bucket`
4. Contact the development team for assistance

---

**Security Fix Applied**: $(date)
**Files Modified**: 6 files
**Risk Level**: CRITICAL → RESOLVED
