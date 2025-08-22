import prisma from '@/lib/prisma';

export interface WarningCheckResult {
  hasWarning: boolean;
  message?: string;
  currentValue?: string;
  expectedValue?: string;
  severity?: string;
  configurationId?: string;
}

export class WarningService {
  /**
   * Check for warnings on a specific entity
   */
  static async checkEntityWarnings(entityType: string, entityId: string, userId?: string): Promise<WarningCheckResult[]> {
    // Build where clause to get user's accessible configurations
    const where: any = {
      entityType,
      isActive: true,
      OR: [
        { isPublic: true } // Public configurations
      ]
    };

    // Add user-specific configurations if userId is provided
    if (userId) {
      where.OR.push(
        { createdBy: userId }, // User's own configurations
        {
          sharedWith: {
            some: {
              userId: userId
            }
          }
        } // Shared configurations
      );
    }

    const configurations = await prisma.warningConfiguration.findMany({
      where
    });

    const results: WarningCheckResult[] = [];

    for (const config of configurations) {
      const result = await this.checkWarning(config, entityType, entityId);
      if (result.hasWarning) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Check a specific warning configuration against an entity
   */
  static async checkWarning(config: any, entityType: string, entityId: string): Promise<WarningCheckResult> {
    try {
      // Get entity data
      const entity = await this.getEntityData(entityType, entityId);
      if (!entity) {
        return { hasWarning: false };
      }

      const fieldValue = this.getFieldValue(entity, config.field);
      const hasWarning = this.evaluateCondition(config, fieldValue, entity);

      if (hasWarning) {
        const message = this.generateWarningMessage(config, fieldValue, entity);
        return {
          hasWarning: true,
          message,
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
          include: { position: true }
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
   * Evaluate warning condition
   */
  private static evaluateCondition(config: any, fieldValue: any, entity?: any): boolean {
    const { condition, operator, value, threshold } = config;

    switch (condition) {
      case 'overdue':
        return this.checkOverdue(fieldValue, threshold, entity);
      case 'empty':
        return this.checkEmpty(fieldValue);
      case 'threshold':
        return this.checkThreshold(fieldValue, operator, value);
      case 'date_range':
        return this.checkDateRange(fieldValue, operator, value);
      case 'custom':
        return this.checkCustom(fieldValue, operator, value);
      default:
        return false;
    }
  }

  /**
   * Check if date is overdue
   */
  private static checkOverdue(dateValue: any, thresholdDays: number | null, entity?: any): boolean {
    if (!dateValue) return false;

    // If threshold is null/undefined, use the position's grade SLA
    let actualThreshold = thresholdDays;
    if (actualThreshold === null || actualThreshold === undefined) {
      if (entity && entity.grade && entity.grade.slaDays) {
        actualThreshold = entity.grade.slaDays;
      } else {
        // Fallback to a default threshold if no grade SLA is available
        actualThreshold = 30;
      }
    }

    if (!actualThreshold) return false;

    const date = new Date(dateValue);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > actualThreshold;
  }

  /**
   * Check if field is empty
   */
  private static checkEmpty(value: any): boolean {
    return value === null || value === undefined || value === '' || 
           (Array.isArray(value) && value.length === 0);
  }

  /**
   * Check threshold conditions
   */
  private static checkThreshold(value: any, operator: string, expectedValue: any): boolean {
    if (value === null || value === undefined) return false;

    const numValue = parseFloat(value);
    const numExpected = parseFloat(expectedValue);

    if (isNaN(numValue) || isNaN(numExpected)) return false;

    switch (operator) {
      case 'gt': return numValue > numExpected;
      case 'gte': return numValue >= numExpected;
      case 'lt': return numValue < numExpected;
      case 'lte': return numValue <= numExpected;
      case 'eq': return numValue === numExpected;
      case 'ne': return numValue !== numExpected;
      default: return false;
    }
  }

  /**
   * Check date range conditions
   */
  private static checkDateRange(dateValue: any, operator: string, expectedValue: any): boolean {
    if (!dateValue) return false;

    const date = new Date(dateValue);
    const expectedDate = new Date(expectedValue);

    if (isNaN(date.getTime()) || isNaN(expectedDate.getTime())) return false;

    switch (operator) {
      case 'gt': return date > expectedDate;
      case 'gte': return date >= expectedDate;
      case 'lt': return date < expectedDate;
      case 'lte': return date <= expectedDate;
      case 'eq': return date.getTime() === expectedDate.getTime();
      case 'ne': return date.getTime() !== expectedDate.getTime();
      default: return false;
    }
  }

  /**
   * Check custom conditions
   */
  private static checkCustom(value: any, operator: string, expectedValue: any): boolean {
    if (value === null || value === undefined) return false;

    const strValue = value.toString().toLowerCase();
    const strExpected = expectedValue.toString().toLowerCase();

    switch (operator) {
      case 'contains': return strValue.includes(strExpected);
      case 'not_contains': return !strValue.includes(strExpected);
      case 'starts_with': return strValue.startsWith(strExpected);
      case 'ends_with': return strValue.endsWith(strExpected);
      case 'eq': return strValue === strExpected;
      case 'ne': return strValue !== strExpected;
      default: return false;
    }
  }

  /**
   * Generate warning message
   */
  private static generateWarningMessage(config: any, currentValue: any, entity?: any): string {
    const { name, field, condition, value, threshold } = config;

    switch (condition) {
      case 'overdue':
        // Calculate the actual threshold used (dynamic or fixed)
        let actualThreshold = threshold;
        if (actualThreshold === null || actualThreshold === undefined) {
          if (entity && entity.grade && entity.grade.slaDays) {
            actualThreshold = entity.grade.slaDays;
          } else {
            actualThreshold = 30; // Default fallback
          }
        }
        
        if (threshold === null || threshold === undefined) {
          return `${name}: ${field} is overdue (${actualThreshold} days SLA from ${entity?.grade?.name || 'grade'} exceeded)`;
        } else {
          return `${name}: ${field} is overdue by ${actualThreshold} days`;
        }
      case 'empty':
        return `${name}: ${field} is required but empty`;
      case 'threshold':
        return `${name}: ${field} value ${currentValue} does not meet threshold ${value}`;
      case 'date_range':
        return `${name}: ${field} date ${currentValue} is outside expected range`;
      case 'custom':
        return `${name}: ${field} does not meet condition "${value}"`;
      default:
        return `${name}: ${field} requires attention`;
    }
  }

  /**
   * Create or update warnings for an entity
   */
  static async createOrUpdateWarnings(entityType: string, entityId: string, userId?: string): Promise<void> {
    const results = await this.checkEntityWarnings(entityType, entityId, userId);

    // Get all existing warnings for this entity
    const existingWarnings = await prisma.warning.findMany({
      where: {
        entityType,
        entityId,
        configuration: {
          OR: [
            { isPublic: true },
            ...(userId ? [{ createdBy: userId }] : []),
            ...(userId ? [{
              sharedWith: {
                some: {
                  userId: userId
                }
              }
            }] : [])
          ]
        }
      }
    });

    // Create or update warnings for current conditions
    const processedConfigurationIds = new Set<string>();
    for (const result of results) {
      if (result.hasWarning && result.configurationId) {
        await this.createOrUpdateWarning(entityType, entityId, result);
        processedConfigurationIds.add(result.configurationId);
      }
    }

    // Remove warnings for configurations that no longer have issues
    for (const warning of existingWarnings) {
      if (!processedConfigurationIds.has(warning.configurationId)) {
        await prisma.warning.delete({
          where: { id: warning.id }
        });
      }
    }
  }

  /**
   * Create or update a specific warning
   */
  private static async createOrUpdateWarning(
    entityType: string, 
    entityId: string, 
    result: WarningCheckResult
  ): Promise<void> {
    // Find the configuration that triggered this warning
    const configurations = await prisma.warningConfiguration.findMany({
      where: {
        entityType,
        isActive: true
      }
    });

    for (const config of configurations) {
      const checkResult = await this.checkWarning(config, entityType, entityId);
      if (checkResult.hasWarning && checkResult.message === result.message) {
        // Check if warning already exists
        const existingWarning = await prisma.warning.findFirst({
          where: {
            configurationId: config.id,
            entityType,
            entityId
          }
        });

        if (existingWarning) {
          // Update existing warning
          await prisma.warning.update({
            where: { id: existingWarning.id },
            data: {
              currentValue: result.currentValue,
              expectedValue: result.expectedValue,
              message: result.message || '',
              severity: result.severity || 'warning',
              updatedAt: new Date()
            }
          });
        } else {
          // Create new warning
          await prisma.warning.create({
            data: {
              configurationId: config.id,
              entityType,
              entityId,
              field: config.field,
              currentValue: result.currentValue,
              expectedValue: result.expectedValue,
              message: result.message || '',
              severity: result.severity || 'warning'
            }
          });
        }
        break;
      }
    }
  }
}
