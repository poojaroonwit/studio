import { startupMinIOInitialization } from './minio';
import { getPool } from './db';
import { execSync } from 'child_process';

export interface StartupResult {
  minio: {
    status: 'success' | 'warning' | 'error' | 'skipped';
    message: string;
    bucket?: string;
    error?: string;
  };
  database: {
    status: 'success' | 'error';
    message: string;
    error?: string;
  };
  redis: {
    status: 'success' | 'warning' | 'error' | 'skipped';
    message: string;
    error?: string;
  };
  seeding: {
    status: 'success' | 'warning' | 'error';
    message: string;
    error?: string;
  };
  overall: 'ready' | 'partial' | 'failed';
}

export async function initializeServices() {
  // Skip during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return {
      minio: { status: 'skipped', message: 'Build time - not initialized' },
      redis: { status: 'skipped', message: 'Build time - not initialized' }
    };
  }
  
  const results = {
    minio: { status: 'unknown', message: 'Not initialized' },
    redis: { status: 'unknown', message: 'Not initialized' }
  };

  // Initialize MinIO
  try {
    const minioResult = await startupMinIOInitialization();
    results.minio = {
      status: minioResult.status,
      message: minioResult.message
    };
  } catch (error) {
    results.minio = {
      status: 'error',
      message: `Failed to initialize MinIO: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }

  // Initialize Redis
  try {
    // const redisClient = await getRedisClient(); // Removed
    // if (redisClient) { // Removed
    //   await redisClient.ping(); // Removed
    //   results.redis = { // Removed
    //     status: 'success', // Removed
    //     message: 'Redis initialized successfully' // Removed
    //   }; // Removed
    // } else { // Removed
    //   results.redis = { // Removed
    //     status: 'warning', // Removed
    //     message: 'Redis client not available' // Removed
    //   }; // Removed
    // } // Removed
    results.redis = { // Added
      status: 'skipped', // Added
      message: 'Redis initialization skipped' // Added
    }; // Added
  } catch (error) {
    results.redis = {
      status: 'error',
      message: `Failed to initialize Redis: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }

  return results;
}

export async function initializeApplication(): Promise<StartupResult> {
  const result: StartupResult = {
    minio: { status: 'error', message: 'Not initialized' },
    database: { status: 'error', message: 'Not initialized' },
    redis: { status: 'error', message: 'Not initialized' },
    seeding: { status: 'error', message: 'Not initialized' },
    overall: 'failed'
  };
  
  // Initialize MinIO
  try {
    const minioResult = await startupMinIOInitialization();
    result.minio = {
      status: minioResult.status as 'success' | 'warning' | 'error',
      message: minioResult.message,
      bucket: minioResult.bucket,
      error: 'error' in minioResult ? minioResult.error : undefined
    };
  } catch (error) {
    console.error('❌ MinIO initialization failed:', error);
    result.minio = {
      status: 'error',
      message: 'Failed to initialize MinIO',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
  
  // Test database connection
  try {
    const pool = getPool();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    result.database = {
      status: 'success',
      message: 'Database connection successful'
    };
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    result.database = {
      status: 'error',
      message: 'Failed to connect to database',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Test Redis connection
  // try { // Removed
  //   const redisClient = await getRedisClient(); // Removed
  //   if (redisClient) { // Removed
  //     await redisClient.ping(); // Removed
  //     result.redis = { // Removed
  //       status: 'success', // Removed
  //       message: 'Redis connection successful' // Removed
  //     }; // Removed
  //   } else { // Removed
  //     result.redis = { // Removed
  //       status: 'error', // Removed
  //       message: 'Redis client not available' // Removed
  //     }; // Removed
  //   } // Removed
  // } catch (error) { // Removed
  //   console.error('❌ Redis connection failed:', error); // Removed
  //   result.redis = { // Removed
  //     status: 'error', // Removed
  //     message: 'Failed to connect to Redis', // Removed
  //     error: error instanceof Error ? error.message : 'Unknown error' // Removed
  //   }; // Removed
  // } // Removed
  result.redis = { // Added
    status: 'skipped', // Added
    message: 'Redis connection skipped' // Added
  }; // Added
  
  // Run database seeding if database is available
  if (result.database.status === 'success') {
    try {
      // Run the seed script
      execSync('npm run seed', { stdio: 'pipe' });
      result.seeding = {
        status: 'success',
        message: 'Database seeded successfully'
      };
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      result.seeding = {
        status: 'error',
        message: 'Failed to seed database',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  } else {
    result.seeding = {
      status: 'error',
      message: 'Cannot seed database - database connection failed'
    };
  }
  
  // Determine overall status
  const successCount = [result.database, result.redis, result.minio].filter(
    service => service.status === 'success'
  ).length;
  
  const errorCount = [result.database, result.redis, result.minio].filter(
    service => service.status === 'error'
  ).length;
  
  if (errorCount === 0) {
    result.overall = 'ready';
  } else if (successCount > 0) {
    result.overall = 'partial';
  } else {
    result.overall = 'failed';
  }
  
  return result;
}

// Function to check if application is ready
export async function isApplicationReady(): Promise<boolean> {
  try {
    const result = await initializeApplication();
    return result.overall === 'ready';
  } catch (error) {
    return false;
  }
}

// Function to seed the database
export async function seedDatabase(): Promise<boolean> {
  try {
    execSync('npx prisma db seed', { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error('Failed to seed database:', error);
    return false;
  }
}

// Auto-initialization on module load (only if not during build)
if (process.env.NEXT_PHASE !== 'phase-production-build') {
  initializeServices().catch(console.error);
}

export function validateEnvironmentVariables() {
  const requiredVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ];

  const optionalVars = [
    'AZURE_AD_CLIENT_ID',
    'AZURE_AD_CLIENT_SECRET', 
    'AZURE_AD_TENANT_ID',
    'REDIS_URL',
    'MINIO_ENDPOINT',
    'MINIO_ACCESS_KEY',
    'MINIO_SECRET_KEY'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease check your .env file or environment configuration.');
    return false;
  }


  return true;
}

export function validateDatabaseConnection() {
  // This would be called after Prisma client is available
  return true;
}

export function validateExternalServices() {
  // Validate Redis, MinIO, etc. connections
  return true;
} 
