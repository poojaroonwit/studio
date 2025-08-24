import { WarningService } from './warningService';
import prisma from './prisma';

export interface WarningAutomationConfig {
  enableRealTimeChecks: boolean;
  enableScheduledChecks: boolean;
  checkInterval: number; // in milliseconds
  batchSize: number;
  retryAttempts: number;
  retryDelay: number; // in milliseconds
}

export class WarningAutomation {
  private static config: WarningAutomationConfig = {
    enableRealTimeChecks: true,
    enableScheduledChecks: true,
    checkInterval: 5 * 60 * 1000, // 5 minutes
    batchSize: 50,
    retryAttempts: 3,
    retryDelay: 1000
  };

  private static isRunning = false;
  private static intervalId: NodeJS.Timeout | null = null;

  /**
   * Initialize the warning automation system
   */
  static initialize(config?: Partial<WarningAutomationConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    console.log('🚀 Initializing Warning Automation System');
    console.log('Configuration:', this.config);

    if (this.config.enableScheduledChecks) {
      this.startScheduledChecks();
    }
  }

  /**
   * Start scheduled warning checks
   */
  static startScheduledChecks() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(async () => {
      if (!this.isRunning) {
        await this.runScheduledCheck();
      }
    }, this.config.checkInterval);

    console.log(`⏰ Scheduled warning checks started (every ${this.config.checkInterval / 1000} seconds)`);
  }

  /**
   * Stop scheduled warning checks
   */
  static stopScheduledChecks() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️ Scheduled warning checks stopped');
    }
  }

  /**
   * Run a scheduled warning check
   */
  static async runScheduledCheck() {
    if (this.isRunning) {
      console.log('⚠️ Warning check already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Starting scheduled warning check...');

    try {
      const startTime = Date.now();
      const results = await this.checkAllWarnings();
      const duration = Date.now() - startTime;

      console.log(`✅ Scheduled warning check completed in ${duration}ms`);
      console.log('Results:', results);
    } catch (error) {
      console.error('❌ Error in scheduled warning check:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check all warnings in the system
   */
  static async checkAllWarnings() {
    const results = {
      totalWarnings: 0,
      warningsCleared: 0,
      warningsCreated: 0,
      errors: 0,
      entitiesChecked: {
        candidates: 0,
        positions: 0,
        headcounts: 0
      }
    };

    try {
      // Get all active warnings
      const allWarnings = await prisma.warning.findMany({
        include: {
          configuration: true
        }
      });

      results.totalWarnings = allWarnings.length;
      console.log(`📋 Found ${allWarnings.length} warnings to check`);

      // Group warnings by entity type for batch processing
      const warningsByEntity = this.groupWarningsByEntity(allWarnings);

      // Process each entity type
      for (const [entityType, warnings] of Object.entries(warningsByEntity)) {
        console.log(`🔍 Processing ${entityType} warnings: ${warnings.length}`);
        
        const entityResults = await this.processEntityWarnings(entityType, warnings);
        
        results.warningsCleared += entityResults.cleared;
        results.warningsCreated += entityResults.created;
        results.errors += entityResults.errors;
        results.entitiesChecked[entityType as keyof typeof results.entitiesChecked] = entityResults.checked;
      }

    } catch (error) {
      console.error('❌ Error in checkAllWarnings:', error);
      results.errors++;
    }

    return results;
  }

  /**
   * Group warnings by entity type
   */
  private static groupWarningsByEntity(warnings: any[]) {
    const grouped: { [key: string]: any[] } = {
      candidates: [],
      positions: [],
      headcounts: []
    };

    for (const warning of warnings) {
      if (grouped[warning.entityType]) {
        grouped[warning.entityType].push(warning);
      }
    }

    return grouped;
  }

  /**
   * Process warnings for a specific entity type
   */
  private static async processEntityWarnings(entityType: string, warnings: any[]) {
    const results = {
      checked: 0,
      cleared: 0,
      created: 0,
      errors: 0
    };

    // Get unique entity IDs
    const entityIds = [...new Set(warnings.map(w => w.entityId))];

    for (const entityId of entityIds) {
      try {
        const entityWarnings = warnings.filter(w => w.entityId === entityId);
        const beforeCount = entityWarnings.length;

        // Use the warning service to check and update warnings
        await WarningService.createOrUpdateWarnings(entityType, entityId);

        // Check if warnings were cleared
        const afterWarnings = await prisma.warning.findMany({
          where: {
            entityType,
            entityId
          }
        });

        const afterCount = afterWarnings.length;
        const cleared = Math.max(0, beforeCount - afterCount);

        results.checked++;
        results.cleared += cleared;

        if (cleared > 0) {
          console.log(`✅ Cleared ${cleared} warnings for ${entityType} ${entityId}`);
        }

      } catch (error) {
        console.error(`❌ Error processing ${entityType} ${entityId}:`, error);
        results.errors++;
      }
    }

    return results;
  }

  /**
   * Trigger immediate warning check for a specific entity
   */
  static async triggerEntityCheck(entityType: string, entityId: string, userId?: string) {
    console.log(`🔍 Triggering immediate warning check for ${entityType} ${entityId}`);

    try {
      await WarningService.createOrUpdateWarnings(entityType, entityId, userId);
      console.log(`✅ Warning check completed for ${entityType} ${entityId}`);
    } catch (error) {
      console.error(`❌ Error in warning check for ${entityType} ${entityId}:`, error);
      throw error;
    }
  }

  /**
   * Trigger warning check with retry logic
   */
  static async triggerEntityCheckWithRetry(
    entityType: string, 
    entityId: string, 
    userId?: string,
    attempts: number = 0
  ): Promise<void> {
    try {
      await this.triggerEntityCheck(entityType, entityId, userId);
    } catch (error) {
      if (attempts < this.config.retryAttempts) {
        console.log(`🔄 Retrying warning check for ${entityType} ${entityId} (attempt ${attempts + 1})`);
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        return this.triggerEntityCheckWithRetry(entityType, entityId, userId, attempts + 1);
      } else {
        console.error(`❌ Failed to check warnings for ${entityType} ${entityId} after ${this.config.retryAttempts} attempts`);
        throw error;
      }
    }
  }

  /**
   * Get automation status
   */
  static getStatus() {
    return {
      isRunning: this.isRunning,
      isScheduled: this.intervalId !== null,
      config: this.config
    };
  }

  /**
   * Update configuration
   */
  static updateConfig(newConfig: Partial<WarningAutomationConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Warning automation configuration updated:', this.config);
  }
}

// Auto-initialize when module is loaded
if (typeof window === 'undefined') {
  // Only initialize on server side
  WarningAutomation.initialize();
}
