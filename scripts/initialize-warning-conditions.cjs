const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Define the required warning conditions
const REQUIRED_WARNING_CONDITIONS = [
  {
    name: 'Position hiring Over Grade SLA',
    description: 'Warns when a position has been open longer than the grade SLA days',
    severity: 'warning',
    isActive: true,
    isPublic: true,
    conditionGroups: [
      {
        id: 'position-sla-group',
        logicalOperator: 'AND',
        conditions: [
          {
            id: 'position-sla-condition',
            entityType: 'position',
            field: 'isOpen',
            condition: 'equals',
            value: 'true'
          },
          {
            id: 'sla-days-condition',
            entityType: 'position',
            field: 'createdAt',
            condition: 'days_ago',
            value: 'grade_sla_days'
          }
        ]
      }
    ],
    groupsLogicalOperator: 'AND'
  },
  {
    name: 'Candidate No Source',
    description: 'Warns when a candidate has no source assigned',
    severity: 'info',
    isActive: true,
    isPublic: true,
    conditionGroups: [
      {
        id: 'candidate-source-group',
        logicalOperator: 'AND',
        conditions: [
          {
            id: 'candidate-source-condition',
            entityType: 'candidate',
            field: 'sourceId',
            condition: 'is_empty'
          }
        ]
      }
    ],
    groupsLogicalOperator: 'AND'
  },
  {
    name: 'Candidate No Recruiter Assigned',
    description: 'Warns when a candidate has no recruiter assigned',
    severity: 'warning',
    isActive: true,
    isPublic: true,
    conditionGroups: [
      {
        id: 'candidate-recruiter-group',
        logicalOperator: 'AND',
        conditions: [
          {
            id: 'candidate-recruiter-condition',
            entityType: 'candidate',
            field: 'recruiterId',
            condition: 'is_empty'
          }
        ]
      }
    ],
    groupsLogicalOperator: 'AND'
  },
  {
    name: 'Candidate No Email',
    description: 'Warns when a candidate has no email address',
    severity: 'warning',
    isActive: true,
    isPublic: true,
    conditionGroups: [
      {
        id: 'candidate-email-group',
        logicalOperator: 'AND',
        conditions: [
          {
            id: 'candidate-email-condition',
            entityType: 'candidate',
            field: 'email',
            condition: 'is_empty'
          }
        ]
      }
    ],
    groupsLogicalOperator: 'AND'
  },
  {
    name: 'Position No Recruiter Assigned',
    description: 'Warns when a position has no recruiter assigned',
    severity: 'warning',
    isActive: true,
    isPublic: true,
    conditionGroups: [
      {
        id: 'position-recruiter-group',
        logicalOperator: 'AND',
        conditions: [
          {
            id: 'position-recruiter-condition',
            entityType: 'position',
            field: 'recruiterId',
            condition: 'is_empty'
          }
        ]
      }
    ],
    groupsLogicalOperator: 'AND'
  },
  {
    name: 'Position Open But No Vacant Headcount',
    description: 'Warns when a position is open but has no vacant headcount',
    severity: 'warning',
    isActive: true,
    isPublic: true,
    conditionGroups: [
      {
        id: 'position-headcount-group',
        logicalOperator: 'AND',
        conditions: [
          {
            id: 'position-status-condition',
            entityType: 'position',
            field: 'isOpen',
            condition: 'equals',
            value: 'true'
          }
        ]
      }
    ],
    groupsLogicalOperator: 'AND'
  },
  {
    name: 'Position No Grade Assigned',
    description: 'Warns when a position has no grade assigned',
    severity: 'warning',
    isActive: true,
    isPublic: true,
    conditionGroups: [
      {
        id: 'position-grade-group',
        logicalOperator: 'AND',
        conditions: [
          {
            id: 'position-grade-condition',
            entityType: 'position',
            field: 'gradeId',
            condition: 'is_empty'
          }
        ]
      }
    ],
    groupsLogicalOperator: 'AND'
  },
  {
    name: 'Position No Hiring Date',
    description: 'Warns when a position has no hiring date set',
    severity: 'info',
    isActive: true,
    isPublic: true,
    conditionGroups: [
      {
        id: 'position-hiring-date-group',
        logicalOperator: 'AND',
        conditions: [
          {
            id: 'position-hiring-date-condition',
            entityType: 'position',
            field: 'hiringDate',
            condition: 'is_empty'
          }
        ]
      }
    ],
    groupsLogicalOperator: 'AND'
  },

];

async function initializeWarningConditions() {
  try {
    console.log('🚀 Starting warning conditions initialization...');
    
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    console.log(`📊 Found ${users.length} users to process`);

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    for (const user of users) {
      console.log(`\n👤 Processing user: ${user.name || user.email} (${user.id})`);
      
      for (const requiredCondition of REQUIRED_WARNING_CONDITIONS) {
        // Check if this warning condition already exists for the user
        const existingCondition = await prisma.warningConfiguration.findFirst({
          where: {
            userId: user.id,
            name: requiredCondition.name
          }
        });

        if (existingCondition) {
          // Check if the condition needs to be updated
          const needsUpdate = 
            existingCondition.description !== requiredCondition.description ||
            existingCondition.severity !== requiredCondition.severity ||
            existingCondition.isActive !== requiredCondition.isActive ||
            existingCondition.isPublic !== requiredCondition.isPublic ||
            JSON.stringify(existingCondition.conditionGroups) !== JSON.stringify(requiredCondition.conditionGroups) ||
            existingCondition.groupsLogicalOperator !== requiredCondition.groupsLogicalOperator;

          if (needsUpdate) {
            // Update the existing condition
            await prisma.warningConfiguration.update({
              where: { id: existingCondition.id },
              data: {
                description: requiredCondition.description,
                severity: requiredCondition.severity,
                isActive: requiredCondition.isActive,
                isPublic: requiredCondition.isPublic,
                conditionGroups: requiredCondition.conditionGroups,
                groupsLogicalOperator: requiredCondition.groupsLogicalOperator,
                updatedAt: new Date()
              }
            });
            
            console.log(`  ✅ Updated: ${requiredCondition.name}`);
            totalUpdated++;
          } else {
            console.log(`  ⏭️  Skipped (up to date): ${requiredCondition.name}`);
            totalSkipped++;
          }
        } else {
          // Create new condition
          await prisma.warningConfiguration.create({
            data: {
              userId: user.id,
              name: requiredCondition.name,
              description: requiredCondition.description,
              severity: requiredCondition.severity,
              isActive: requiredCondition.isActive,
              isPublic: requiredCondition.isPublic,
              conditionGroups: requiredCondition.conditionGroups,
              groupsLogicalOperator: requiredCondition.groupsLogicalOperator
            }
          });
          
          console.log(`  ➕ Created: ${requiredCondition.name}`);
          totalCreated++;
        }
      }
    }

    console.log('\n📈 Initialization Summary:');
    console.log(`  • Total users processed: ${users.length}`);
    console.log(`  • Conditions created: ${totalCreated}`);
    console.log(`  • Conditions updated: ${totalUpdated}`);
    console.log(`  • Conditions skipped (up to date): ${totalSkipped}`);
    console.log(`  • Total conditions processed: ${totalCreated + totalUpdated + totalSkipped}`);

    // Verify the results
    console.log('\n🔍 Verification:');
    for (const user of users) {
      const userConditions = await prisma.warningConfiguration.findMany({
        where: { userId: user.id },
        select: { name: true, isActive: true }
      });
      
      console.log(`  ${user.name || user.email}: ${userConditions.length} conditions (${userConditions.filter(c => c.isActive).length} active)`);
    }

    console.log('\n✅ Warning conditions initialization completed successfully!');

  } catch (error) {
    console.error('❌ Error during warning conditions initialization:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  initializeWarningConditions()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeWarningConditions, REQUIRED_WARNING_CONDITIONS };
