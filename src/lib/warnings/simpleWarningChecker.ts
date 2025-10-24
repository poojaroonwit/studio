import prisma from '@/lib/prisma';

export interface WarningCheckResult {
  hasWarning: boolean;
  message?: string;
  currentValue?: string;
  expectedValue?: string;
  severity?: string;
  configurationId?: string;
}

export interface WarningConfiguration {
  id: string;
  name: string;
  field: string;
  condition: string;
  value?: string;
  threshold?: number;
  severity: string;
  entityType: string;
  isActive: boolean;
  isPublic: boolean;
  createdBy?: string;
  sharedWith?: any[];
}

/**
 * Simple warning checker - focused on basic warning logic
 */
export class SimpleWarningChecker {
  /**
   * Check for warnings on a specific entity
   */
  static async checkEntityWarnings(
    entityType: string, 
    entityId: string, 
    userId?: string
  ): Promise<WarningCheckResult[]> {
    try {
      // Get accessible configurations
      const configurations = await this.getAccessibleConfigurations(entityType, userId);
      
      const results: WarningCheckResult[] = [];

      for (const config of configurations) {
        // Ensure config has required non-null fields
        if (config.field && config.condition) {
          const result = await this.checkSingleWarning(config as WarningConfiguration, entityType, entityId);
          if (result.hasWarning) {
            results.push(result);
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Error checking warnings:', error);
      return [];
    }
  }

  /**
   * Get configurations accessible to the user
   */
  private static async getAccessibleConfigurations(entityType: string, userId?: string) {
    const where: any = {
      entityType,
      isActive: true,
      OR: [{ isPublic: true }]
    };

    if (userId) {
      where.OR.push(
        { createdBy: userId },
        {
          sharedWith: {
            some: { userId }
          }
        }
      );
    }

    return await prisma.warningConfiguration.findMany({ where });
  }

  /**
   * Check a single warning configuration
   */
  private static async checkSingleWarning(
    config: WarningConfiguration, 
    entityType: string, 
    entityId: string
  ): Promise<WarningCheckResult> {
    try {
      const entity = await this.getEntityData(entityType, entityId);
      if (!entity) {
        return { hasWarning: false };
      }

      const fieldValue = this.getFieldValue(entity, config.field);
      const hasWarning = this.evaluateSimpleCondition(config, fieldValue, entity);

      if (hasWarning) {
        return {
          hasWarning: true,
          message: await this.generateSimpleMessage(config, fieldValue, entity),
          currentValue: fieldValue?.toString(),
          expectedValue: config.value,
          severity: config.severity,
          configurationId: config.id
        };
      }

      return { hasWarning: false };
    } catch (error) {
      console.error('Error checking warning:', error);
      return { hasWarning: false };
    }
  }

  /**
   * Get entity data from database
   */
  private static async getEntityData(entityType: string, entityId: string) {
    switch (entityType) {
      case 'position':
        return await prisma.position.findUnique({
          where: { id: entityId },
          include: { grade: true }
        });
      case 'candidate':
        return await prisma.candidate.findUnique({
          where: { id: entityId },
          include: { 
            position: {
              include: { grade: true }
            }
          }
        });
      case 'headcount':
        return await prisma.headcount.findUnique({
          where: { id: entityId },
          include: { position: true, candidate: true }
        });
      default:
        return null;
    }
  }

  /**
   * Get field value from entity object
   */
  private static getFieldValue(entity: any, field: string): any {
    const fieldPath = field.split('.');
    let value = entity;

    for (const path of fieldPath) {
      if (value && typeof value === 'object' && path in value) {
        value = value[path];
      } else {
        return null;
      }
    }

    return value;
  }

  /**
   * Evaluate simple condition (single condition on main entity)
   */
  private static evaluateSimpleCondition(config: WarningConfiguration, fieldValue: any, entity?: any): boolean {
    const { condition, value, threshold } = config;

    switch (condition) {
      case 'empty':
      case 'is_empty':
        return this.isEmpty(fieldValue);
      case 'is_not_empty':
        return !this.isEmpty(fieldValue);
      case 'eq':
      case 'equals':
        return this.equals(fieldValue, value);
      case 'gt':
      case 'greater_than':
        return this.greaterThan(fieldValue, value, entity);
      case 'lt':
      case 'less_than':
        return this.lessThan(fieldValue, value, entity);
      case 'contains':
        return this.contains(fieldValue, value);
      case 'overdue':
      case 'days_ago':
        return this.daysAgo(fieldValue, value, entity);
      case 'custom':
        return this.evaluateCustomCondition(config, fieldValue, entity);
      case 'is_true':
        return this.isTrue(fieldValue);
      case 'is_false':
        return this.isFalse(fieldValue);
      default:
        return false;
    }
  }

  // Simple condition checkers
  private static isEmpty(value: any): boolean {
    return value === null || value === undefined || value === '' || 
           (Array.isArray(value) && value.length === 0);
  }

  private static equals(value: any, expectedValue: any): boolean {
    if (value === null || value === undefined) return false;
    return value.toString() === expectedValue.toString();
  }

  private static greaterThan(value: any, expectedValue: any, entity?: any): boolean {
    if (expectedValue === 'grade_sla_days' && entity?.grade?.slaDays) {
      return Number(value) > entity.grade.slaDays;
    }
    return Number(value) > Number(expectedValue);
  }

  private static lessThan(value: any, expectedValue: any, entity?: any): boolean {
    if (expectedValue === 'grade_sla_days' && entity?.grade?.slaDays) {
      return Number(value) < entity.grade.slaDays;
    }
    return Number(value) < Number(expectedValue);
  }

  private static contains(fieldValue: any, expectedValue: any): boolean {
    if (!fieldValue || !expectedValue) return false;
    return String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase());
  }

  private static daysAgo(fieldValue: any, expectedDays: any, entity?: any): boolean {
    if (!fieldValue) return false;
    
    const fieldDate = new Date(fieldValue);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - fieldDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (expectedDays === 'grade_sla_days' && entity?.grade?.slaDays) {
      return daysDiff > entity.grade.slaDays;
    }
    return daysDiff > Number(expectedDays);
  }

  private static evaluateCustomCondition(config: WarningConfiguration, fieldValue: any, entity?: any): boolean {
    const { field, value } = config;
    
    // Handle specific custom conditions
    if (field === 'isOpen' && value === 'true') {
      // For "Position Open But No Recruiter" - check if position is open AND has no recruiter
      return this.isTrue(fieldValue) && this.isEmpty(entity?.recruiterId);
    }
    
    // Default custom condition evaluation
    return this.equals(fieldValue, value);
  }

  private static isTrue(value: any): boolean {
    return value === true || value === 'true' || value === 1;
  }

  private static isFalse(value: any): boolean {
    return value === false || value === 'false' || value === 0;
  }

  /**
   * Get effective SLA start date for a candidate
   * This method determines the correct start date for SLA calculations
   */
  private static async getEffectiveSLAStartDate(entity: any): Promise<string | null> {
    try {
      if (!entity?.id || !entity?.position?.id) {
        return null;
      }

      // First, try to get requestDate from headcounts for this position
      const headcountQuery = await prisma.headcount.findFirst({
        where: {
          positionId: entity.position.id,
          requestDate: { not: null }
        },
        orderBy: { requestDate: 'asc' },
        select: { requestDate: true }
      });

      if (headcountQuery?.requestDate) {
        return headcountQuery.requestDate.toISOString();
      }

      // Fallback to candidate's application date
      if (entity.applicationDate) {
        return entity.applicationDate;
      }

      // Final fallback to entity creation date
      if (entity.createdAt) {
        return entity.createdAt;
      }

      return null;
    } catch (error) {
      console.error('Error getting effective SLA start date:', error);
      return null;
    }
  }

  /**
   * Generate simple warning message
   */
  private static async generateSimpleMessage(config: WarningConfiguration, currentValue: any, entity?: any): Promise<string> {
    const { name, field, condition, value, threshold } = config;

    switch (condition) {
      case 'empty':
      case 'is_empty':
        return `${name}: ${field} is required but empty`;
      case 'is_not_empty':
        return `${name}: ${field} should be empty but has value`;
      case 'eq':
      case 'equals':
        return `${name}: ${field} value ${currentValue} does not equal ${value}`;
      case 'gt':
      case 'greater_than':
        return `${name}: ${field} value ${currentValue} is not greater than ${value}`;
      case 'lt':
      case 'less_than':
        return `${name}: ${field} value ${currentValue} is not less than ${value}`;
      case 'contains':
        return `${name}: ${field} does not contain "${value}"`;
      case 'overdue':
      case 'days_ago':
        if (field === 'applicationDate') {
          // For candidate SLA warnings, use the same logic as position detail page
          let dateToUse = currentValue;
          let slaDays = threshold || 15;
          
          if (entity?.entityType === 'candidate' && entity?.position) {
            // Use the effective SLA start date which gets requestDate from headcounts
            const effectiveSLAStartDate = await this.getEffectiveSLAStartDate(entity);
            if (effectiveSLAStartDate) {
              dateToUse = effectiveSLAStartDate;
            }
          }
          if (entity?.entityType === 'candidate' && entity?.position?.grade?.slaDays) {
            slaDays = entity.position.grade.slaDays;
          } else if (entity?.grade?.slaDays) {
            slaDays = entity.grade.slaDays;
          }
          
          const daysDiff = Math.floor((new Date().getTime() - new Date(dateToUse).getTime()) / (1000 * 60 * 60 * 24));
          return `${name}: Application is overdue (${daysDiff} days, SLA: ${slaDays} days)`;
        }
        return `${name}: ${field} has exceeded the time limit`;
      case 'custom':
        if (field === 'isOpen' && value === 'true') {
          return `${name}: Position is open but has no recruiter assigned`;
        }
        return `${name}: ${field} requires attention`;
      case 'is_true':
        return `${name}: ${field} should be true but is false`;
      case 'is_false':
        return `${name}: ${field} should be false but is true`;
      default:
        return `${name}: ${field} requires attention`;
    }
  }
}
