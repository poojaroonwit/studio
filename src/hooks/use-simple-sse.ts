/**
 * @deprecated This file is deprecated. Use the new Enhanced SSE system instead.
 * 
 * Migration Guide:
 * - Replace useSimpleSSE() with useEnhancedSSE()
 * - Replace useCandidateUpdates() with useEnhancedCandidateUpdates()
 * - Replace usePositionUpdates() with useEnhancedPositionUpdates()
 * - Replace useUploadQueueUpdates() with useEnhancedUploadQueueUpdates()
 * - Replace useNotifications() with useEnhancedNotifications()
 * 
 * The new system provides:
 * - Sequential endpoint loading (one by one)
 * - Better error handling and connection monitoring
 * - Prevention of hanging EventSource connections
 * - Automatic retry with exponential backoff
 * 
 * See: src/hooks/use-enhanced-sse.ts
 */

import { useEnhancedSSE, useEnhancedCandidateUpdates, useEnhancedPositionUpdates, useEnhancedUploadQueueUpdates, useEnhancedDashboardUpdates } from './use-enhanced-sse';

/**
 * @deprecated Use useEnhancedSSE() instead
 */
export function useSimpleSSE() {
  console.warn('⚠️ useSimpleSSE is deprecated. Use useEnhancedSSE() instead.');
  return useEnhancedSSE();
}

/**
 * @deprecated Use useEnhancedCandidateUpdates() instead
 */
export function useCandidateUpdates() {
  console.warn('⚠️ useCandidateUpdates is deprecated. Use useEnhancedCandidateUpdates() instead.');
  return useEnhancedCandidateUpdates();
}

/**
 * @deprecated Use useEnhancedPositionUpdates() instead
 */
export function usePositionUpdates() {
  console.warn('⚠️ usePositionUpdates is deprecated. Use useEnhancedPositionUpdates() instead.');
  return useEnhancedPositionUpdates();
}

/**
 * @deprecated Use useEnhancedUploadQueueUpdates() instead
 */
export function useUploadQueueUpdates() {
  console.warn('⚠️ useUploadQueueUpdates is deprecated. Use useEnhancedUploadQueueUpdates() instead.');
  return useEnhancedUploadQueueUpdates();
}

/**
 * @deprecated Use useEnhancedDashboardUpdates() instead
 */
export function useNotifications() {
  console.warn('⚠️ useNotifications is deprecated. Use useEnhancedDashboardUpdates() instead.');
  return useEnhancedDashboardUpdates();
}
