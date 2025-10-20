import { Client as Minio } from 'minio';

export const MINIO_BUCKET = process.env.MINIO_BUCKET_NAME || process.env.MINIO_BUCKET || 'uploads';
// Use the console port for public access to match environment configuration
export const MINIO_PUBLIC_BASE_URL = process.env.MINIO_PUBLIC_BASE_URL || 'http://localhost:9001';

export const minioClient = new Minio({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10), // Use API port for S3 requests
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

// Function to set CORS configuration for MinIO (no-op in SDK)
// Note: MinIO's Node SDK does not expose bucket CORS methods.
//       Configure CORS via server env (MINIO_API_CORS_*) or 'mc' CLI.
export async function setMinIOCORS() {
  console.warn('[MINIO] setMinIOCORS is a no-op. Configure CORS via MINIO_API_CORS_* env or mc admin config.');
}

// Function to ensure bucket exists with enhanced configuration
export async function ensureBucketExists() {
  // Skip during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return {
      status: 'success',
      bucket: MINIO_BUCKET,
      message: 'Bucket check skipped during build',
      created: false
    };
  }

  try {
    const exists = await minioClient.bucketExists(MINIO_BUCKET);
    
    if (!exists) {
      await minioClient.makeBucket(MINIO_BUCKET);
      
      // Attempt to ensure CORS is configured (no-op here; configure at server level)
      await setMinIOCORS();
      
      // Set bucket policy for private access only (security fix)
      try {
        // Remove any existing public policies and enforce private access
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Deny',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${MINIO_BUCKET}/*`],
              Condition: {
                StringNotEquals: {
                  'aws:userid': process.env.MINIO_ACCESS_KEY
                }
              }
            }
          ]
        };
        
        await minioClient.setBucketPolicy(MINIO_BUCKET, JSON.stringify(policy));
        console.log(`[MINIO] ✅ SECURITY: Set private bucket policy for '${MINIO_BUCKET}' - files now require authentication`);
      } catch (policyError) {
        console.warn(`[MINIO] Failed to set bucket policy for '${MINIO_BUCKET}':`, policyError);
      }
      
      // Set bucket versioning (optional)
      try {
        await minioClient.setBucketVersioning(MINIO_BUCKET, { Status: 'Enabled' });
      } catch (versioningError) {
        console.warn(`[MINIO] Failed to enable bucket versioning for '${MINIO_BUCKET}':`, versioningError);
      }
      
    } else {
      // Attempt to ensure CORS is configured (no-op here; configure at server level)
      await setMinIOCORS();
    }
    
    // Test bucket access by listing objects
    await minioClient.listObjects(MINIO_BUCKET, '', true);
    
    return {
      status: 'success',
      bucket: MINIO_BUCKET,
      message: 'Bucket is ready for uploads',
      created: !exists
    };
    
  } catch (error) {
    console.error(`[MINIO] Failed to initialize bucket '${MINIO_BUCKET}':`, error);
    throw new Error(`Failed to initialize MinIO bucket: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Function to initialize MinIO with comprehensive setup
export async function initializeMinIO() {
  // Skip during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return {
      status: 'success',
      bucket: MINIO_BUCKET,
      message: 'MinIO initialization skipped during build',
      created: false
    };
  }

  try {
    await minioClient.listBuckets();
    
    // Ensure bucket exists
    const result = await ensureBucketExists();
    
    return result;
    
  } catch (error) {
    console.error('[MINIO] Failed to initialize MinIO:', error);
    throw error;
  }
}

// Function to get bucket info
export async function getBucketInfo() {
  // Skip during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return {
      exists: true,
      bucket: MINIO_BUCKET,
      message: 'Bucket info skipped during build'
    };
  }

  try {
    const exists = await minioClient.bucketExists(MINIO_BUCKET);
    if (!exists) {
      return {
        exists: false,
        bucket: MINIO_BUCKET,
        message: 'Bucket does not exist'
      };
    }
    
    // Test bucket access by listing objects
    await minioClient.listObjects(MINIO_BUCKET, '', true);
    
    return {
      exists: true,
      bucket: MINIO_BUCKET,
      message: 'Bucket is accessible and ready for use'
    };
    
  } catch (error) {
    console.error(`[MINIO] Error getting bucket info for '${MINIO_BUCKET}':`, error);
    throw error;
  }
}

// Startup initialization function - call this when the app starts
export async function startupMinIOInitialization() {
  // Skip during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return {
      status: 'success',
      message: 'MinIO initialization skipped during build',
      bucket: MINIO_BUCKET
    };
  }

  try {
    // Check if MinIO is available
    const isAvailable = await checkMinIOAvailability();
    
    if (!isAvailable) {
      console.warn('[MINIO] MinIO is not available. File uploads will not work.');
      return {
        status: 'warning',
        message: 'MinIO is not available. File uploads will not work.',
        bucket: MINIO_BUCKET
      };
    }
    
    // Initialize MinIO
    const result = await initializeMinIO();
    
    return result;
    
  } catch (error) {
    console.error('[MINIO] Failed to initialize MinIO during startup:', error);
    return {
      status: 'error',
      message: 'Failed to initialize MinIO during startup',
      error: error instanceof Error ? error.message : 'Unknown error',
      bucket: MINIO_BUCKET
    };
  }
}

// Function to check if MinIO is available
async function checkMinIOAvailability(): Promise<boolean> {
  try {
    // Try to list buckets (this will fail if MinIO is not available)
    await minioClient.listBuckets();
    return true;
  } catch (error) {
    console.error('[MINIO] MinIO is not available:', error);
    return false;
  }
}

// Function to generate signed URL for secure file access
export async function getSignedUrl(objectName: string, expiresIn: number = 3600): Promise<string> {
  try {
    // Create a separate client instance with public endpoint for signed URLs
    const publicBase = process.env.MINIO_PUBLIC_BASE_URL;
    if (publicBase) {
      const publicUrl = new URL(publicBase);
      const publicClient = new Minio({
        endPoint: publicUrl.hostname,
        port: parseInt(publicUrl.port || (publicUrl.protocol === 'https:' ? '443' : '80'), 10),
        useSSL: publicUrl.protocol === 'https:',
        accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      });
      return await publicClient.presignedGetObject(MINIO_BUCKET, objectName, expiresIn);
    }
    
    // Fallback to original client if no public base URL
    const signedUrl = await minioClient.presignedGetObject(MINIO_BUCKET, objectName, expiresIn);
    return signedUrl;
  } catch (error) {
    console.error(`[MINIO] Failed to generate signed URL for '${objectName}':`, error);
    throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Function to generate signed URL with custom expiration
export async function getSignedUrlWithExpiration(objectName: string, expiresInSeconds: number): Promise<string> {
  try {
    // Create a separate client instance with public endpoint for signed URLs
    const publicBase = process.env.MINIO_PUBLIC_BASE_URL;
    if (publicBase) {
      const publicUrl = new URL(publicBase);
      const publicClient = new Minio({
        endPoint: publicUrl.hostname,
        port: parseInt(publicUrl.port || (publicUrl.protocol === 'https:' ? '443' : '80'), 10),
        useSSL: publicUrl.protocol === 'https:',
        accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      });
      return await publicClient.presignedGetObject(MINIO_BUCKET, objectName, expiresInSeconds);
    }
    
    // Fallback to original client if no public base URL
    const signedUrl = await minioClient.presignedGetObject(MINIO_BUCKET, objectName, expiresInSeconds);
    return signedUrl;
  } catch (error) {
    console.error(`[MINIO] Failed to generate signed URL for '${objectName}' with ${expiresInSeconds}s expiration:`, error);
    throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Function to enforce private bucket policy (security fix)
export async function enforcePrivateBucketPolicy(): Promise<void> {
  try {
    console.log(`[MINIO] 🔒 Enforcing private bucket policy for '${MINIO_BUCKET}'...`);
    
    // Remove any existing public policies and enforce private access
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Deny',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${MINIO_BUCKET}/*`],
          Condition: {
            StringNotEquals: {
              'aws:userid': process.env.MINIO_ACCESS_KEY
            }
          }
        }
      ]
    };
    
    await minioClient.setBucketPolicy(MINIO_BUCKET, JSON.stringify(policy));
    console.log(`[MINIO] ✅ SECURITY: Private bucket policy enforced for '${MINIO_BUCKET}' - all files now require authentication`);
  } catch (error) {
    console.error(`[MINIO] ❌ Failed to enforce private bucket policy for '${MINIO_BUCKET}':`, error);
    throw new Error(`Failed to enforce private bucket policy: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Auto-initialization on module load (optional - uncomment if you want automatic initialization)
// startupMinIOInitialization().catch(console.error); 