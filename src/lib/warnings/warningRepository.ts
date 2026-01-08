import prisma from '@/lib/prisma';
import { WarningCheckResult } from './simpleWarningChecker';

/**
 * Warning repository - handles all database operations for warnings
 */
export class WarningRepository {
  /**
   * Create or update warnings for an entity
   */
  static async createOrUpdateWarnings(
    entityType: string, 
    entityId: string, 
    results: WarningCheckResult[]
  ): Promise<void> {
    try {
      // Get all existing warnings for this entity
      const existingWarnings = await prisma.warning.findMany({
        where: { entityType, entityId }
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
        if (!processedConfigurationIds.has(warning.configuration_id)) {
          await prisma.warning.delete({
            where: { id: warning.id }
          });
        }
      }
    } catch (error) {
      console.error(`Error in createOrUpdateWarnings for ${entityType} ${entityId}:`, error);
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
   * Get all warnings for an entity
   */
  static async getEntityWarnings(entityType: string, entityId: string) {
    return await prisma.warning.findMany({
      where: { entityType, entityId },
      include: {
        configuration: true
      }
    });
  }

  /**
   * Delete all warnings for an entity
   */
  static async deleteEntityWarnings(entityType: string, entityId: string) {
    return await prisma.warning.deleteMany({
      where: { entityType, entityId }
    });
  }

  /**
   * Get warning statistics
   */
  static async getWarningStats(entityType?: string) {
    const where: any = {};
    if (entityType) {
      where.entityType = entityType;
    }

    const [total, critical, error, warning, info] = await Promise.all([
      prisma.warning.count({ where }),
      prisma.warning.count({ where: { ...where, severity: 'critical' } }),
      prisma.warning.count({ where: { ...where, severity: 'error' } }),
      prisma.warning.count({ where: { ...where, severity: 'warning' } }),
      prisma.warning.count({ where: { ...where, severity: 'info' } })
    ]);

    return { total, critical, error, warning, info };
  }
}
