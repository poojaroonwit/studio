/**
 * Utility functions to handle build-time vs runtime environment differences
 */

export const isBuildTime = () => {
  // Check if we're in a build context
  // During Docker build, DATABASE_URL is set to a dummy value
  // At runtime, DATABASE_URL will be the actual database connection string
  if (process.env.DATABASE_URL?.includes('dummy')) {
    return true; // We're in build phase (dummy DATABASE_URL)
  }
  
  // Also check Next.js build phase (set automatically by Next.js during builds)
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    // But if we have a real DATABASE_URL, we're actually running, not building
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('dummy')) {
      return false; // We have a real database URL, so we're running
    }
    return true; // We're in build phase
  }
  
  return false; // Not in build phase
};

export const isRuntime = () => {
  return !isBuildTime();
};

export const getBuildSafeConfig = () => {
  if (isBuildTime()) {
    return {
      minio: {
        endPoint: 'localhost',
        port: '9000',
        bucket: 'uploads',
        useSSL: false,
        accessKey: 'minioadmin',
        secretKey: 'minioadmin'
      },
      redis: {
        url: 'redis://redis:6379'
      },
      database: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:secure_password@postgres:8521/studio_production'
      }
    };
  }
  
  return {
    minio: {
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: process.env.MINIO_PORT || '9000',
      bucket: process.env.MINIO_BUCKET_NAME || process.env.MINIO_BUCKET || 'uploads',
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://redis:6379'
    },
    database: {
      url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:8521/db'
    }
  };
};

export const logBuildSafe = (message: string, data?: any) => {
  if (isBuildTime()) {
  
  }
}; 
