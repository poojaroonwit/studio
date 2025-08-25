import prisma from '@/lib/prisma';

// Default warning configurations for new users
const DEFAULT_WARNING_CONFIGURATIONS = [
  // Position warnings
  {
    name: 'No hiring date',
    description: 'Position has no hiring date set',
    entityType: 'position',
    field: 'hiringDate',
    condition: 'empty',
    operator: 'eq',
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
    operator: 'eq',
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
    operator: 'eq',
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
    operator: 'eq',
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
    operator: 'eq',
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
    operator: 'eq',
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
    operator: 'eq',
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
    operator: 'eq',
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

/**
 * Create default warning configurations for a new user
 * @param userId - The ID of the new user
 * @param createdBy - The ID of the user who created this user (usually admin)
 */
export async function createDefaultWarningConfigurations(userId: string, createdBy: string) {
  try {
    // Creating default warning configurations for user

    const configurations = await Promise.all(
      DEFAULT_WARNING_CONFIGURATIONS.map(async (config) => {
        return await prisma.warningConfiguration.create({
          data: {
            ...config,
            createdBy: userId,
          },
        });
      })
    );

    // Created default warning configurations for user

    // Log audit events for the creation
    await Promise.all(
      configurations.map(async (config) => {
        await prisma.auditLog.create({
          data: {
            level: 'AUDIT',
            message: `Default warning configuration '${config.name}' created for user`,
            source: 'UserWarningDefaults',
            action: 'CREATE',
            entity: 'WARNING_CONFIGURATION',
            entity_id: config.id,
            user_id: createdBy,
            details: {
              configurationName: config.name,
              entityType: config.entityType,
              field: config.field,
              condition: config.condition,
              severity: config.severity,
              forUserId: userId,
              isDefault: true,
            },
          },
        });
      })
    );

    return configurations;
  } catch (error) {
    console.error('Error creating default warning configurations:', error);
    throw error;
  }
}

/**
 * Check if a user has any warning configurations
 * @param userId - The ID of the user to check
 */
export async function hasWarningConfigurations(userId: string): Promise<boolean> {
  try {
    const count = await prisma.warningConfiguration.count({
      where: {
        createdBy: userId,
      },
    });
    return count > 0;
  } catch (error) {
    console.error('Error checking user warning configurations:', error);
    return false;
  }
}

/**
 * Get default warning configurations (for reference)
 */
export function getDefaultWarningConfigurations() {
  return DEFAULT_WARNING_CONFIGURATIONS;
}
