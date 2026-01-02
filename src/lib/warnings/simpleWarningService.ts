import { SimpleWarningChecker, WarningCheckResult } from './simpleWarningChecker';
import { WarningRepository } from './warningRepository';
import { getSystemSetting } from '../systemSettings';

/**
 * Simple warning service - clean public API for warning operations
 */
export class SimpleWarningService {
  /**
   * Check for warnings on a specific entity
   */
  static async checkEntityWarnings(
    entityType: string, 
    entityId: string, 
    userId?: string
  ): Promise<WarningCheckResult[]> {
    return await SimpleWarningChecker.checkEntityWarnings(entityType, entityId, userId);
  }

  /**
   * Create or update warnings for an entity
   */
  static async createOrUpdateWarnings(
    entityType: string, 
    entityId: string, 
    userId?: string
  ): Promise<void> {
    // Check if warning criteria checks are enabled
    const enabled = await getSystemSetting('warningCriteriaEnabled');
    if (enabled === 'false') {
      return;
    }

    const results = await this.checkEntityWarnings(entityType, entityId, userId);
    await WarningRepository.createOrUpdateWarnings(entityType, entityId, results);
  }

  /**
   * Get all warnings for an entity
   */
  static async getEntityWarnings(entityType: string, entityId: string) {
    return await WarningRepository.getEntityWarnings(entityType, entityId);
  }

  /**
   * Delete all warnings for an entity
   */
  static async deleteEntityWarnings(entityType: string, entityId: string) {
    return await WarningRepository.deleteEntityWarnings(entityType, entityId);
  }

  /**
   * Get warning statistics
   */
  static async getWarningStats(entityType?: string) {
    return await WarningRepository.getWarningStats(entityType);
  }
}

// Export types for external use
export type { WarningCheckResult } from './simpleWarningChecker';
