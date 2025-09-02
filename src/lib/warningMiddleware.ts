import { SimpleWarningService } from './warnings';

export interface WarningCheckOptions {
  entityType: string;
  entityId: string;
  userId?: string;
  delay?: number; // Delay in milliseconds before checking
}

/**
 * Middleware to automatically check warnings after entity operations
 */
export class WarningMiddleware {
  /**
   * Schedule a warning check for an entity
   */
  static async scheduleWarningCheck(options: WarningCheckOptions): Promise<void> {
    const { entityType, entityId, userId, delay = 1000 } = options;
    
    // Use setTimeout to delay the check, allowing the database transaction to complete
    setTimeout(async () => {
      try {
        // console.log(`🔄 Scheduled warning check for ${entityType} ${entityId}`);
        await SimpleWarningService.createOrUpdateWarnings(entityType, entityId, userId);
        // console.log(`✅ Completed scheduled warning check for ${entityType} ${entityId}`);
      } catch (error) {
        console.error(`❌ Error in scheduled warning check for ${entityType} ${entityId}:`, error);
      }
    }, delay);
  }

  /**
   * Immediately check warnings for an entity
   */
  static async checkWarningsImmediately(options: WarningCheckOptions): Promise<void> {
    const { entityType, entityId, userId } = options;
    
    try {
      await SimpleWarningService.createOrUpdateWarnings(entityType, entityId, userId);
    } catch (error) {
      console.error(`❌ Error in immediate warning check for ${entityType} ${entityId}:`, error);
    }
  }

  /**
   * Batch check warnings for multiple entities
   */
  static async batchCheckWarnings(entities: WarningCheckOptions[]): Promise<void> {
    const promises = entities.map(async (entity) => {
      try {
        await SimpleWarningService.createOrUpdateWarnings(entity.entityType, entity.entityId, entity.userId);
      } catch (error) {
        console.error(`❌ Error checking warnings for ${entity.entityId}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }
}

/**
 * Higher-order function to wrap API handlers with automatic warning checks
 */
export function withWarningCheck<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  getWarningOptions: (...args: T) => WarningCheckOptions | null
) {
  return async (...args: T): Promise<R> => {
    const result = await handler(...args);
    
    const warningOptions = getWarningOptions(...args);
    if (warningOptions) {
      // Schedule the warning check to run after the response is sent
      WarningMiddleware.scheduleWarningCheck(warningOptions);
    }
    
    return result;
  };
}

/**
 * Decorator for API routes that automatically checks warnings
 */
export function autoWarningCheck(getOptions: (request: Request, params?: any) => WarningCheckOptions | null) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);
      
      const options = getOptions(args[0], args[1]);
      if (options) {
        WarningMiddleware.scheduleWarningCheck(options);
      }
      
      return result;
    };
    
    return descriptor;
  };
}
