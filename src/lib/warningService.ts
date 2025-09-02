// DEPRECATED: This complex service has been replaced with simplified modules
// Use the new SimpleWarningService instead:
// import { SimpleWarningService } from '@/lib/warnings';

import { SimpleWarningService, WarningCheckResult } from '@/lib/warnings';

export { WarningCheckResult };

export class WarningService {
  /**
   * @deprecated Use SimpleWarningService.checkEntityWarnings instead
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
      const hasWarning = await this.evaluateCondition(config, fieldValue, entity);

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
          include: { 
            position: {
              include: {
                grade: true
              }
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
   * Evaluate warning condition - Unified approach with 4 types: Simple, Complex, Cross-Entity, Condition Groups
   */
  private static async evaluateCondition(config: any, fieldValue: any, entity?: any): Promise<boolean> {
    const { logicalOperator, conditions, crossEntityConditions, conditionGroups } = config;

    // 1. Condition Groups (new format with nested groups)
    if (conditionGroups && Array.isArray(conditionGroups) && conditionGroups.length > 0) {
      return this.evaluateConditionGroups(conditionGroups, entity);
    }

    // 2. Cross-Entity Conditions (most flexible)
    if (crossEntityConditions && Array.isArray(crossEntityConditions) && crossEntityConditions.length > 0) {
      return await this.evaluateCrossEntityConditions(crossEntityConditions, logicalOperator, entity);
    }

    // 3. Complex Conditions (multiple conditions on same entity)
    if (conditions && Array.isArray(conditions) && conditions.length > 0) {
      return this.evaluateComplexCondition(conditions, logicalOperator, entity);
    }

    // 4. Simple Condition (single condition on main entity)
    return this.evaluateSimpleCondition(config, fieldValue, entity);
  }

  /**
   * Evaluate a simple condition (single condition on main entity)
   */
  private static evaluateSimpleCondition(config: any, fieldValue: any, entity?: any): boolean {
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
   * Evaluate complex conditions with logical operators
   */
  private static evaluateComplexCondition(conditions: any[], logicalOperator: string, entity: any): boolean {
    if (!conditions || conditions.length === 0) return false;

    const results = conditions.map(conditionConfig => {
      const fieldValue = this.getFieldValue(entity, conditionConfig.field);
      return this.evaluateSingleCondition(conditionConfig, fieldValue, entity);
    });

    switch (logicalOperator?.toUpperCase()) {
      case 'AND':
        return results.every(result => result);
      case 'OR':
        return results.some(result => result);
      case 'NOT':
        // For NOT, we expect only one condition and return the opposite
        return results.length === 1 ? !results[0] : false;
      default:
        // Default to AND if no operator specified
        return results.every(result => result);
    }
  }

  /**
   * Evaluate a single condition from a complex condition array
   */
  private static evaluateSingleCondition(conditionConfig: any, fieldValue: any, entity: any): boolean {
    const { condition, value } = conditionConfig;

    switch (condition) {
      case 'is_empty':
        return this.checkEmpty(fieldValue);
      case 'is_not_empty':
        return !this.checkEmpty(fieldValue);
      case 'equals':
        return this.checkEquals(fieldValue, value);
      case 'greater_than':
        return this.checkGreaterThan(fieldValue, value, entity);
      case 'less_than':
        return this.checkLessThan(fieldValue, value, entity);
      case 'contains':
        return this.checkContains(fieldValue, value);
      case 'days_ago':
        return this.checkDaysAgo(fieldValue, value, entity);
      case 'is_true':
        return this.checkIsTrue(fieldValue);
      case 'is_false':
        return this.checkIsFalse(fieldValue);
      // Legacy support for old condition types
      case 'empty':
        return this.checkEmpty(fieldValue);
      case 'not_empty':
        return !this.checkEmpty(fieldValue);
      case 'overdue':
        return this.checkOverdue(fieldValue, null, entity);
      case 'threshold':
        return this.checkThreshold(fieldValue, 'gt', value);
      case 'date_range':
        return this.checkDateRange(fieldValue, 'between', value);
      case 'days_since':
        return this.checkDaysSince(fieldValue, 'gt', value, entity);
      case 'custom':
        return this.checkCustom(fieldValue, 'equals', value);
      default:
        return false;
    }
  }

  /**
   * Evaluate cross-entity conditions (most flexible - can handle any entity relationships)
   */
  private static async evaluateCrossEntityConditions(conditions: any[], logicalOperator: string, mainEntity: any): Promise<boolean> {
    const results = await Promise.all(conditions.map(async condition => {
      const { entityType, field, condition: conditionType, operator, value, threshold } = condition;
      
      // Get the appropriate entity based on entityType
      let targetEntity = null;
      let fieldValue = null;

      switch (entityType) {
        case 'candidate':
          // Main entity is already a candidate
          targetEntity = mainEntity;
          fieldValue = this.getFieldValue(mainEntity, field);
          break;
          
        case 'position':
          // Get position from candidate's relationship
          if (mainEntity && mainEntity.position) {
            targetEntity = mainEntity.position;
            fieldValue = this.getFieldValue(mainEntity.position, field);
          }
          break;
          
        case 'grade':
          // Get grade from position's relationship
          if (mainEntity && mainEntity.position && mainEntity.position.grade) {
            targetEntity = mainEntity.position.grade;
            fieldValue = this.getFieldValue(mainEntity.position.grade, field);
          }
          break;
          
        case 'recruiter':
          // Get recruiter from candidate's relationship
          if (mainEntity && mainEntity.recruiter) {
            targetEntity = mainEntity.recruiter;
            fieldValue = this.getFieldValue(mainEntity.recruiter, field);
          }
          break;
          
        case 'source':
          // Get source from candidate's relationship
          if (mainEntity && mainEntity.source) {
            targetEntity = mainEntity.source;
            fieldValue = this.getFieldValue(mainEntity.source, field);
          }
          break;
          
        default:
          // Try to get from main entity's relationships
          if (mainEntity && mainEntity[entityType]) {
            targetEntity = mainEntity[entityType];
            fieldValue = this.getFieldValue(mainEntity[entityType], field);
          }
          break;
      }

      // Evaluate the condition using the target entity
      return this.evaluateSingleCondition(condition, fieldValue, targetEntity);
    }));

    // Apply logical operator
    switch (logicalOperator?.toUpperCase()) {
      case 'AND':
        return results.every(result => result);
      case 'OR':
        return results.some(result => result);
      case 'NOT':
        return results.length === 1 && !results[0];
      default:
        return results.every(result => result); // Default to AND
    }
  }

  /**
   * Evaluate condition groups (new format with nested groups and conditions)
   */
  private static evaluateConditionGroups(conditionGroups: any[], entity: any): boolean {
    if (!conditionGroups || conditionGroups.length === 0) return false;

    // Evaluate each group and combine results with AND (all groups must be true)
    const groupResults = conditionGroups.map(group => {
      const { logicalOperator = 'AND', conditions = [] } = group;
      
      if (!conditions || conditions.length === 0) return true; // Empty group is considered true

      // Evaluate all conditions within this group
      const conditionResults = conditions.map((condition: any) => {
        // Handle cross-entity conditions by getting the appropriate entity and field value
        let targetEntity = entity;
        let fieldValue = null;

        if (condition.entityType && condition.entityType !== this.getEntityType(entity)) {
          // This is a cross-entity condition, get the related entity
          targetEntity = this.getRelatedEntity(entity, condition.entityType);
          if (targetEntity) {
            fieldValue = this.getFieldValue(targetEntity, condition.field);
          }
        } else {
          // Same entity condition
          fieldValue = this.getFieldValue(entity, condition.field);
        }

        return this.evaluateSingleCondition(condition, fieldValue, targetEntity);
      });

      // Apply the group's logical operator
      switch (logicalOperator?.toUpperCase()) {
        case 'AND':
          return conditionResults.every((result: boolean) => result);
        case 'OR':
          return conditionResults.some((result: boolean) => result);
        case 'NOT':
          return conditionResults.length === 1 ? !conditionResults[0] : false;
        default:
          return conditionResults.every((result: boolean) => result); // Default to AND
      }
    });

    // All groups must be true (AND between groups)
    return groupResults.every(result => result);
  }

  /**
   * Get the entity type from an entity object
   */
  private static getEntityType(entity: any): string {
    if (!entity) return '';
    
    // Check for specific entity properties to determine type
    if (entity.title !== undefined) return 'position';
    if (entity.name !== undefined && entity.email !== undefined) return 'candidate';
    if (entity.positionId !== undefined) return 'headcount';
    
    return '';
  }

  /**
   * Get a related entity from the main entity
   */
  private static getRelatedEntity(entity: any, targetEntityType: string): any {
    if (!entity) return null;

    switch (targetEntityType) {
      case 'position':
        return entity.position || null;
      case 'candidate':
        return entity.candidate || null;
      case 'grade':
        return entity.grade || (entity.position?.grade) || null;
      case 'recruiter':
        return entity.recruiter || null;
      case 'source':
        return entity.source || null;
      default:
        return entity[targetEntityType] || null;
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
      // For candidates, get the grade SLA from their associated position
      if (entity && entity.position && entity.position.grade && entity.position.grade.slaDays) {
        actualThreshold = entity.position.grade.slaDays;
      }
      // For positions, get the grade SLA directly
      else if (entity && entity.grade && entity.grade.slaDays) {
        actualThreshold = entity.grade.slaDays;
      }
      // For candidates without positions, don't trigger SLA warnings
      else if (entity && entity.positionId === null) {
        return false; // No SLA warning for candidates without positions
      }
      // Fallback to a default threshold if no grade SLA is available
      else {
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
   * Check if a value is greater than the expected value
   */
  private static checkGreaterThan(fieldValue: any, expectedValue: any, entity: any): boolean {
    if (expectedValue === 'grade_sla_days' && entity?.grade?.slaDays) {
      return Number(fieldValue) > entity.grade.slaDays;
    }
    return Number(fieldValue) > Number(expectedValue);
  }

  /**
   * Check if a value is less than the expected value
   */
  private static checkLessThan(fieldValue: any, expectedValue: any, entity: any): boolean {
    if (expectedValue === 'grade_sla_days' && entity?.grade?.slaDays) {
      return Number(fieldValue) < entity.grade.slaDays;
    }
    return Number(fieldValue) < Number(expectedValue);
  }

  /**
   * Check if a field contains the expected text
   */
  private static checkContains(fieldValue: any, expectedValue: any): boolean {
    if (!fieldValue || !expectedValue) return false;
    return String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase());
  }

  /**
   * Check if a date field is older than the specified days
   */
  private static checkDaysAgo(fieldValue: any, expectedValue: any, entity: any): boolean {
    if (!fieldValue) return false;
    
    const fieldDate = new Date(fieldValue);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - fieldDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (expectedValue === 'grade_sla_days' && entity?.grade?.slaDays) {
      return daysDiff > entity.grade.slaDays;
    }
    return daysDiff > Number(expectedValue);
  }

  /**
   * Check if a boolean field is true
   */
  private static checkIsTrue(fieldValue: any): boolean {
    return fieldValue === true || fieldValue === 'true' || fieldValue === 1;
  }

  /**
   * Check if a boolean field is false
   */
  private static checkIsFalse(fieldValue: any): boolean {
    return fieldValue === false || fieldValue === 'false' || fieldValue === 0;
  }

  /**
   * Check days since condition
   */
  private static checkDaysSince(dateValue: any, operator: string, expectedDays: any, entity?: any): boolean {
    if (!dateValue) return false;

    const date = new Date(dateValue);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Handle special case for grade_sla_days
    let actualExpectedDays = expectedDays;
    if (expectedDays === 'grade_sla_days') {
      // For candidates, get the grade SLA from their associated position
      if (entity && entity.position && entity.position.grade && entity.position.grade.slaDays) {
        actualExpectedDays = entity.position.grade.slaDays;
      }
      // For positions, get the grade SLA directly
      else if (entity && entity.grade && entity.grade.slaDays) {
        actualExpectedDays = entity.grade.slaDays;
      }
      // Fallback to a default threshold if no grade SLA is available
      else {
        actualExpectedDays = 30;
      }
    } else {
      actualExpectedDays = parseInt(expectedDays);
    }

    if (isNaN(actualExpectedDays)) return false;

    switch (operator) {
      case 'greater_than':
        return diffDays > actualExpectedDays;
      case 'less_than':
        return diffDays < actualExpectedDays;
      case 'equals':
        return diffDays === actualExpectedDays;
      case 'greater_than_or_equal':
        return diffDays >= actualExpectedDays;
      case 'less_than_or_equal':
        return diffDays <= actualExpectedDays;
      default:
        return false;
    }
  }

  /**
   * Check equals condition
   */
  private static checkEquals(value: any, expectedValue: any): boolean {
    if (value === null || value === undefined) return false;
    
    // Handle boolean values
    if (typeof expectedValue === 'string' && (expectedValue === 'true' || expectedValue === 'false')) {
      const boolValue = expectedValue === 'true';
      return value === boolValue;
    }
    
    // Handle string comparison
    return value.toString() === expectedValue.toString();
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
        let gradeName = 'grade';
        
        if (actualThreshold === null || actualThreshold === undefined) {
          // For candidates, get the grade SLA from their associated position
          if (entity && entity.position && entity.position.grade && entity.position.grade.slaDays) {
            actualThreshold = entity.position.grade.slaDays;
            gradeName = entity.position.grade.name || 'grade';
          }
          // For positions, get the grade SLA directly
          else if (entity && entity.grade && entity.grade.slaDays) {
            actualThreshold = entity.grade.slaDays;
            gradeName = entity.grade.name || 'grade';
          } else {
            actualThreshold = 30; // Default fallback
          }
        }
        
        if (threshold === null || threshold === undefined) {
          return `${name}: ${field} is overdue (${actualThreshold} days SLA from ${gradeName} exceeded)`;
        } else {
          return `${name}: ${field} is overdue by ${actualThreshold} days`;
        }
      case 'empty':
        return `${name}: ${field} is required but empty`;
      case 'not_empty':
        return `${name}: ${field} should be empty but has value`;
      case 'threshold':
        return `${name}: ${field} value ${currentValue} does not meet threshold ${value}`;
      case 'date_range':
        return `${name}: ${field} date ${currentValue} is outside expected range`;
      case 'days_since':
        return `${name}: ${field} has exceeded the time limit`;
      case 'equals':
        return `${name}: ${field} value ${currentValue} does not equal ${value}`;
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
    try {
      const results = await this.checkEntityWarnings(entityType, entityId, userId);

      // Get all existing warnings for this entity
      const existingWarnings = await prisma.warning.findMany({
        where: {
          entityType,
          entityId
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
      let clearedCount = 0;
      for (const warning of existingWarnings) {
        if (!processedConfigurationIds.has(warning.configuration_id)) {
          await prisma.warning.delete({
            where: { id: warning.id }
          });
          clearedCount++;
        }
      }
      
    } catch (error) {
      console.error(`❌ Error in createOrUpdateWarnings for ${entityType} ${entityId}:`, error);
      throw error;
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
    if (!result.configurationId) {
      console.error('No configuration ID provided for warning result');
      return;
    }

    // Get the configuration that triggered this warning
    const config = await prisma.warningConfiguration.findUnique({
      where: { id: result.configurationId }
    });

    if (!config) {
      console.error(`Configuration ${result.configurationId} not found`);
      return;
    }

    // Check if warning already exists
    const existingWarning = await prisma.warning.findFirst({
      where: {
        configuration_id: result.configurationId,
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
          updated_at: new Date()
        }
      });
    } else {
      // Create new warning
      await prisma.warning.create({
        data: {
          configuration_id: result.configurationId,
          entityType,
          entityId,
          field: config.field || '',
          currentValue: result.currentValue,
          expectedValue: result.expectedValue,
          message: result.message || '',
          severity: result.severity || 'warning',
          updated_at: new Date()
        }
      });
    }
  }

  /**
   * @deprecated This entire service is deprecated. Use the new simplified modules:
   * - SimpleWarningService for warning operations
   * - SimpleWarningChecker for condition evaluation
   * - WarningRepository for database operations
   * 
   * Migration guide:
   * 1. Replace WarningService.checkEntityWarnings with SimpleWarningService.checkEntityWarnings
   * 2. Replace WarningService.createOrUpdateWarnings with SimpleWarningService.createOrUpdateWarnings
   * 3. Import from '@/lib/warnings' instead of this file
   */
}
