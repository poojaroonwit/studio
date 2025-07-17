#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';

console.log('🔧 Setting up database with postgres user...');

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('Please set DATABASE_URL=postgresql://postgres:secure_password@postgres:8521/studio_production');
    process.exit(1);
}

console.log(`📊 Using database: ${process.env.DATABASE_URL}`);

try {
    // Generate Prisma client
    console.log('🔨 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    // Run database migrations
    console.log('🔄 Running database migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });

    // Seed the database
    console.log('🌱 Seeding database with initial data...');
    execSync('npx prisma db seed', { stdio: 'inherit' });

    console.log('✅ Database setup complete!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Start your application: npm run dev');
    console.log('2. Access the application at: http://localhost:8021');
    console.log('3. Login with: admin@ncc.com / nccadmin');
    console.log('');
    console.log('🔍 If you encounter any issues, check:');
    console.log(`- Database connection: ${process.env.DATABASE_URL}`);
    console.log('- Application logs for detailed error messages');

} catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('');
    console.log('🔍 Troubleshooting:');
    console.log('1. Ensure PostgreSQL is running');
    console.log('2. Verify DATABASE_URL is correct');
    console.log('3. Check if the database exists');
    console.log('4. Ensure the postgres user has proper permissions');
    process.exit(1);
} 