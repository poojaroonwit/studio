// Centralized realtime hook - replaces all scattered realtime implementations
// Fixed circular dependency by removing useInfiniteLoopPrevention import from optimized version
export { useUnifiedRealtime } from './use-unified-realtime-optimized';

// Re-export for backward compatibility
export type { UnifiedRealtimeOptions } from './use-unified-realtime-optimized';
