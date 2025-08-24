const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Default warning configurations for new users
const DEFAULT_WARNING_CONFIGURATIONS = [
  // Position warnings
  {
    name: 'No hiring date',
    description: 'Position has no hiring date set',
    entityType: 'position',
    field: 'hiringDate',
    condition: 'empty',
    operator: null,
    value: null,
    threshold: null,
    severity: 'warning',
    isActive: true,
    isPublic: false,
  },
  {
    name: 'SLA',
    description: 'Position hiring date is overdue (15 days SLA)',
    entityType: 'position',
    field: 'hiringDate',
    condition: 'overdue',
    operator: 'gt',
    value: null,
    threshold: 15,
    severity: 'error',
    isActive: true,
    isPublic: false,
  },
  {
    name: 'Position No Grade',
    description: 'Position has no grade assigned',
    entityType: 'position',
    field: 'grade',
    condition: 'empty',
    operator: null,
    value: null,
    threshold: null,
    severity: 'warning',
    isActive: true,
    isPublic: false,
  },
  {
    name: 'Position No Hiring Date',
    description: 'Position has no hiring date set',
    entityType: 'position',
    field: 'hiringDate',
    condition: 'empty',
    operator: null,
    value: null,
    threshold: null,
    severity: 'warning',
    isActive: true,
    isPublic: false,
  },
  {
    name: 'Position No Grade Assigned',
    description: 'Position has no headcount assigned',
    entityType: 'position',
    field: 'headcount',
    condition: 'empty',
    operator: null,
    value: null,
    threshold: null,
    severity: 'warning',
    isActive: true,
    isPublic: false,
  },
  {
    name: 'Position Open But No Recruiter',
    description: 'Position has vacancies but no recruiter assigned',
    entityType: 'position',
    field: 'vacancies',
    condition: 'threshold',
    operator: 'gt',
    value: '0',
    threshold: 0,
    severity: 'warning',
    isActive: true,
    isPublic: false,
  },
  {
    name: 'Position No Recruiter Assigned',
    description: 'Position has no recruiter assigned',
    entityType: 'position',
    field: 'recruiterId',
    condition: 'empty',
    operator: null,
    value: null,
    threshold: null,
    severity: 'warning',
    isActive: true,
    isPublic: false,
  },
  
  // Candidate warnings
  {
    name: 'Candidate No Email',
    description: 'Candidate has no email address',
    entityType: 'candidate',
    field: 'email',
    condition: 'empty',
    operator: null,
    value: null,
    threshold: null,
    severity: 'error',
    isActive: true,
    isPublic: false,
  },
  {
    name: 'Candidate No Recruiter Assigned',
    description: 'Candidate has no recruiter assigned',
    entityType: 'candidate',
    field: 'recruiterId',
    condition: 'empty',
    operator: null,
    value: null,
    threshold: null,
    severity: 'warning',
    isActive: true,
    isPublic: false,
  },
  {
    name: 'Candidate No Source',
    description: 'Candidate has no source information',
    entityType: 'candidate',
    field: 'source',
    condition: 'empty',
    operator: null,
    value: null,
    threshold: null,
    severity: 'warning',
    isActive: true,
    isPublic: false,
  },
  {
    name: 'Candidate Over Grade SLA',
    description: 'Candidate application is overdue (15 days SLA)',
    entityType: 'candidate',
    field: 'applicationDate',
    condition: 'overdue',
    operator: 'gt',
    value: null,
    threshold: 15,
    severity: 'error',
    isActive: true,
    isPublic: false,
  },
];

async function addDefaultWarningsToUsers() {
  console.log('🔧 Adding Default Warning Configurations to Users...\n');

  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    console.log(`📋 Found ${users.length} users`);

    for (const user of users) {
      console.log(`\n👤 Processing user: ${user.name} (${user.email})`);
      
      // Check if user already has warning configurations
      const existingConfigs = await prisma.warningConfiguration.findMany({
        where: {
          createdBy: user.id,
        },
        select: {
          id: true,
        },
      });

      if (existingConfigs.length > 0) {
        console.log(`  ✅ User already has ${existingConfigs.length} warning configurations - skipping`);
        continue;
      }

      console.log(`  🔧 Creating default warning configurations for ${user.name}...`);

      // Create default configurations for this user
      const configurations = await Promise.all(
        DEFAULT_WARNING_CONFIGURATIONS.map(async (config) => {
          return await prisma.warningConfiguration.create({
            data: {
              ...config,
              createdByUser: {
                connect: {
                  id: user.id,
                },
              },
            },
          });
        })
      );

      console.log(`  ✅ Created ${configurations.length} default warning configurations for ${user.name}`);

      // Log audit events for the creation
      await Promise.all(
        configurations.map(async (config) => {
          await prisma.auditLog.create({
            data: {
              action: 'CREATE',
              entityType: 'WARNING_CONFIGURATION',
              entityId: config.id,
              userId: user.id, // Self-created
              details: {
                configurationName: config.name,
                entityType: config.entityType,
                field: config.field,
                condition: config.condition,
                severity: config.severity,
                forUserId: user.id,
                isDefault: true,
                addedByScript: true,
              },
            },
          });
        })
      );
    }

    console.log('\n✅ Default warning configurations added to all users!');

    // Show summary
    console.log('\n📊 Summary:');
    for (const user of users) {
      const configs = await prisma.warningConfiguration.findMany({
        where: {
          createdBy: user.id,
        },
      });
      console.log(`  - ${user.name}: ${configs.length} configurations`);
    }

  } catch (error) {
    console.error('❌ Error adding default warning configurations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDefaultWarningsToUsers();
