const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function insertDefaultWarningConfigurations() {
  try {
    console.log('🔄 Starting default warning configurations insertion...');

    // Get all users to assign configurations to
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true }
    });

    if (users.length === 0) {
      console.log('❌ No users found. Please create users first.');
      return;
    }

    console.log(`👥 Found ${users.length} users to assign configurations to`);

    // Define the default warning configurations
    const defaultConfigurations = [
            {
        name: 'Position Hiring Over SLA',
        description: 'Warns when an open position has exceeded the SLA days for hiring',
        severity: 'warning',
        isActive: true,
        isPublic: true,
        conditionGroups: [
          {
            id: 'group-1',
            logicalOperator: 'AND',
            conditions: [
              {
                id: 'condition-1',
                entityType: 'position',
                field: 'isOpen',
                condition: 'equals',
                value: 'true'
              },
              {
                id: 'condition-2',
                entityType: 'position',
                field: 'gradeId',
                condition: 'is_not_empty',
                value: null
              },
              {
                id: 'condition-3',
                entityType: 'position',
                field: 'createdAt',
                condition: 'days_ago',
                value: 'grade_sla_days'
              }
            ]
          }
        ]
      },
      {
        name: 'Candidate No Source',
        description: 'Warns when a candidate has no source assigned',
        severity: 'info',
        isActive: true,
        isPublic: true,
        conditionGroups: [
          {
            id: 'group-1',
            logicalOperator: 'AND',
            conditions: [
              {
                id: 'condition-1',
                entityType: 'candidate',
                field: 'source',
                condition: 'is_empty',
                value: null
              }
            ]
          }
        ]
      },
      {
        name: 'Candidate No Recruiter Assigned',
        description: 'Warns when a candidate has no recruiter assigned',
        severity: 'warning',
        isActive: true,
        isPublic: true,
        conditionGroups: [
          {
            id: 'group-1',
            logicalOperator: 'AND',
            conditions: [
              {
                id: 'condition-1',
                entityType: 'candidate',
                field: 'recruiterId',
                condition: 'is_empty',
                value: null
              }
            ]
          }
        ]
      },
      {
        name: 'Candidate No Email',
        description: 'Warns when a candidate has no email address',
        severity: 'error',
        isActive: true,
        isPublic: true,
        conditionGroups: [
          {
            id: 'group-1',
            logicalOperator: 'AND',
            conditions: [
              {
                id: 'condition-1',
                entityType: 'candidate',
                field: 'email',
                condition: 'is_empty',
                value: null
              }
            ]
          }
        ]
      },
      {
        name: 'Position No Recruiter Assigned',
        description: 'Warns when a position has no recruiter assigned',
        severity: 'warning',
        isActive: true,
        isPublic: true,
        conditionGroups: [
          {
            id: 'group-1',
            logicalOperator: 'AND',
            conditions: [
              {
                id: 'condition-1',
                entityType: 'position',
                field: 'recruiterId',
                condition: 'is_empty',
                value: null
              }
            ]
          }
        ]
      },
      {
        name: 'Position Open But No Recruiter',
        description: 'Warns when a position is open but has no recruiter assigned',
        severity: 'warning',
        isActive: true,
        isPublic: true,
        conditionGroups: [
          {
            id: 'group-1',
            logicalOperator: 'AND',
            conditions: [
              {
                id: 'condition-1',
                entityType: 'position',
                field: 'isOpen',
                condition: 'equals',
                value: 'true'
              },
              {
                id: 'condition-2',
                entityType: 'position',
                field: 'recruiterId',
                condition: 'is_empty',
                value: null
              }
            ]
          }
        ]
      },
      {
        name: 'Position No Grade Assigned',
        description: 'Warns when a position has no grade assigned',
        severity: 'info',
        isActive: true,
        isPublic: true,
        conditionGroups: [
          {
            id: 'group-1',
            logicalOperator: 'AND',
            conditions: [
              {
                id: 'condition-1',
                entityType: 'position',
                field: 'gradeId',
                condition: 'is_empty',
                value: null
              }
            ]
          }
        ]
      },
      {
        name: 'Position No Start Date',
        description: 'Warns when a position has no start date set',
        severity: 'warning',
        isActive: true,
        isPublic: true,
        conditionGroups: [
          {
            id: 'group-1',
            logicalOperator: 'AND',
            conditions: [
              {
                id: 'condition-1',
                entityType: 'position',
                field: 'startDate',
                condition: 'is_empty',
                value: null
              }
            ]
          }
        ]
      },
      {
        name: 'Position No Grade',
        description: 'Warns when a position has no grade assigned (alternative name)',
        severity: 'info',
        isActive: true,
        isPublic: true,
        conditionGroups: [
          {
            id: 'group-1',
            logicalOperator: 'AND',
            conditions: [
              {
                id: 'condition-1',
                entityType: 'position',
                field: 'gradeId',
                condition: 'is_empty',
                value: null
              }
            ]
          }
        ]
      }
    ];

    // Create warning configurations for each user
    console.log('📝 Creating default warning configurations...');
    let totalCreated = 0;
    let totalSkipped = 0;

    for (const user of users) {
      console.log(`👤 Processing user: ${user.name} (${user.email})`);
      
      for (const config of defaultConfigurations) {
        try {
          // Check if configuration already exists for this user
          const existingConfig = await prisma.warningConfiguration.findFirst({
            where: {
              name: config.name,
              createdBy: user.id
            }
          });

          if (existingConfig) {
            console.log(`  ⏭️  Skipped: ${config.name} (already exists)`);
            totalSkipped++;
            continue;
          }

          const createdConfig = await prisma.warningConfiguration.create({
            data: {
              name: config.name,
              description: config.description,
              severity: config.severity,
              isActive: config.isActive,
              isPublic: config.isPublic,
              conditionGroups: config.conditionGroups,
              createdBy: user.id
            }
          });
          
          console.log(`  ✅ Created: ${createdConfig.name}`);
          totalCreated++;
        } catch (error) {
          console.error(`  ❌ Failed to create ${config.name} for ${user.name}:`, error.message);
        }
      }
    }

    console.log(`\n🎉 Default warning configurations insertion completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Created: ${totalCreated} new configurations`);
    console.log(`   - Skipped: ${totalSkipped} existing configurations`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Configurations per user: ${defaultConfigurations.length}`);

  } catch (error) {
    console.error('❌ Error during default warning configurations insertion:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  insertDefaultWarningConfigurations()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { insertDefaultWarningConfigurations };
