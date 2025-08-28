const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabase() {
  console.log('🔍 Testing database connectivity...\n');
  
  try {
    // Test 1: Check database connection
    console.log('1. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test 2: Check if admin user exists
    console.log('\n2. Checking admin user...');
    const user = await prisma.user.findUnique({
      where: { email: 'admin@qsncc.com' }
    });
    
    if (user) {
      console.log('✅ Admin user found');
      console.log('   ID:', user.id);
      console.log('   Name:', user.name);
      console.log('   Role:', user.role);
      console.log('   Has password:', !!user.password);
    } else {
      console.log('❌ Admin user not found');
    }
    
    // Test 3: Check total users
    console.log('\n3. Checking total users...');
    const userCount = await prisma.user.count();
    console.log('✅ Total users in database:', userCount);
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
