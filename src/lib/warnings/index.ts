// Main warning service - use this for most operations
export { SimpleWarningService } from './simpleWarningService';

// Individual modules - use these for specific functionality
export { SimpleWarningChecker } from './simpleWarningChecker';
export { WarningRepository } from './warningRepository';

// Types
export type { WarningCheckResult } from './simpleWarningChecker';
export type { WarningConfiguration } from './simpleWarningChecker';
