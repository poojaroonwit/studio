import { PrismaClient } from '@prisma/client';

async function testDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Check if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name NOT LIKE 'pg_%'
      ORDER BY table_name
    `;
    
    console.log('📊 Found tables:', tables.map(t => t.table_name));
    
    // Check migration status
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at 
      FROM _prisma_migrations 
      ORDER BY started_at
    `;
    
    console.log('🔄 Migration status:', migrations);
    
    // Test a simple query
    const userCount = await prisma.user.count();
    console.log('👥 User count:', userCount);
    
    const positionCount = await prisma.position.count();
    console.log('💼 Position count:', positionCount);
    
    console.log('✅ Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase(); 