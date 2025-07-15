import { Client as Minio } from 'minio';

export const MINIO_BUCKET = process.env.MINIO_BUCKET_NAME || process.env.MINIO_BUCKET || 'uploads';
export const MINIO_PUBLIC_BASE_URL = process.env.MINIO_PUBLIC_BASE_URL || 'http://localhost:8621'; // Use API port, not console port



export const minioClient = new Minio({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

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
      
      // Set bucket policy for public read access (optional)
      try {
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${MINIO_BUCKET}/*`]
            }
          ]
        };
        
        await minioClient.setBucketPolicy(MINIO_BUCKET, JSON.stringify(policy));
      } catch (policyError) {
        console.warn(`[MINIO] Failed to set bucket policy for '${MINIO_BUCKET}':`, policyError);
      }
      
      // Set bucket versioning (optional)
      try {
        await minioClient.setBucketVersioning(MINIO_BUCKET, { Status: 'Enabled' });
      } catch (versioningError) {
        console.warn(`[MINIO] Failed to enable bucket versioning for '${MINIO_BUCKET}':`, versioningError);
      }
      
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
    console.log('[MINIO] Checking MinIO availability...');
    // Try to list buckets (this will fail if MinIO is not available)
    await minioClient.listBuckets();
    console.log('[MINIO] MinIO is available');
    return true;
  } catch (error) {
    console.error('[MINIO] MinIO is not available:', error);
    return false;
  }
}

// Auto-initialization on module load (optional - uncomment if you want automatic initialization)
// startupMinIOInitialization().catch(console.error); 