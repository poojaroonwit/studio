/**
 * Utility functions to handle build-time vs runtime environment differences
 */

export const isBuildTime = () => {
  return process.env.NEXT_PHASE === 'phase-production-build' || 
         process.env.NODE_ENV === 'production' && !process.env.NEXT_PHASE;
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
    console.log(`[BUILD] ${message}`, data || '');
  } else {
    console.log(message, data || '');
  }
}; 