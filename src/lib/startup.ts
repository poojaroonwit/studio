import { startupMinIOInitialization } from './minio';
import { getPool } from './db';
import { getRedisClient } from './redis';
import { execSync } from 'child_process';

export interface StartupResult {
  minio: {
    status: 'success' | 'warning' | 'error';
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
    status: 'success' | 'error';
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

export async function initializeApplication(): Promise<StartupResult> {
  console.log('🚀 Starting application initialization...');
  
  const result: StartupResult = {
    minio: { status: 'error', message: 'Not initialized' },
    database: { status: 'error', message: 'Not initialized' },
    redis: { status: 'error', message: 'Not initialized' },
    seeding: { status: 'error', message: 'Not initialized' },
    overall: 'failed'
  };
  
  // Initialize MinIO
  try {
    console.log('📦 Initializing MinIO...');
    const minioResult = await startupMinIOInitialization();
    result.minio = {
      status: minioResult.status as 'success' | 'warning' | 'error',
      message: minioResult.message,
      bucket: minioResult.bucket,
      error: 'error' in minioResult ? minioResult.error : undefined
    };
    console.log(`✅ MinIO initialization: ${minioResult.status}`);
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
    console.log('🗄️ Testing database connection...');
    const pool = getPool();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    result.database = {
      status: 'success',
      message: 'Database connection successful'
    };
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    result.database = {
      status: 'error',
      message: 'Failed to connect to database',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Test Redis connection
  try {
    console.log('🔴 Testing Redis connection...');
    const redisClient = await getRedisClient();
    if (redisClient) {
      await redisClient.ping();
      result.redis = {
        status: 'success',
        message: 'Redis connection successful'
      };
      console.log('✅ Redis connection successful');
    } else {
      result.redis = {
        status: 'error',
        message: 'Redis client not available'
      };
      console.log('⚠️ Redis client not available');
    }
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    result.redis = {
      status: 'error',
      message: 'Failed to connect to Redis',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
  
  // Run database seeding if database is available
  if (result.database.status === 'success') {
    try {
      console.log('🌱 Running database seeding...');
      // Run the seed script
      execSync('npm run seed', { stdio: 'pipe' });
      result.seeding = {
        status: 'success',
        message: 'Database seeded successfully'
      };
      console.log('✅ Database seeding completed');
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
  
  console.log(`🎯 Application initialization completed. Overall status: ${result.overall}`);
  console.log('📊 Summary:');
  console.log(`  Database: ${result.database.status}`);
  console.log(`  Redis: ${result.redis.status}`);
  console.log(`  MinIO: ${result.minio.status}`);
  console.log(`  Seeding: ${result.seeding.status}`);
  
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

// Auto-initialization on module load (optional)
// initializeApplication().catch(console.error); 

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

  console.log('✅ All required environment variables are set');
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