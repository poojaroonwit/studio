import type { EnhancedSSEEndpointStatus } from '@/hooks/use-enhanced-sse';
import {
  AlertTriangle,
  CheckCircle,
  PowerOff,
  XCircle,
} from 'lucide-react';

export function getEnhancedSseStatusIcon(endpoint: EnhancedSSEEndpointStatus) {
  if (endpoint.isConnected) {
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  }

  if (endpoint.lastError) {
    return <XCircle className="h-4 w-4 text-red-500" />;
  }

  if (!endpoint.enabled) {
    return <PowerOff className="h-4 w-4 text-gray-400" />;
  }

  return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
}

export function getEnhancedSseStatusColor(endpoint: EnhancedSSEEndpointStatus) {
  if (endpoint.isConnected) {
    return 'bg-green-100 text-green-800 border-green-200';
  }

  if (endpoint.lastError) {
    return 'bg-red-100 text-red-800 border-red-200';
  }

  if (!endpoint.enabled) {
    return 'bg-gray-100 text-gray-800 border-gray-200';
  }

  return 'bg-yellow-100 text-yellow-800 border-yellow-200';
}

export function getEnhancedSseStatusText(endpoint: EnhancedSSEEndpointStatus) {
  if (endpoint.isConnected) {
    return 'Connected';
  }

  if (endpoint.lastError) {
    return 'Failed';
  }

  if (!endpoint.enabled) {
    return 'Disabled';
  }

  return 'Disconnected';
}

export function formatEnhancedSseError(error: string) {
  return error.length > 50 ? `${error.substring(0, 50)}...` : error;
}

export type EnhancedSseSummaryColor = 'blue' | 'green' | 'gray' | 'red';

const ENHANCED_SSE_SUMMARY_CARD_CLASSES: Record<EnhancedSseSummaryColor, {
  backgroundClassName: string;
  textClassName: string;
}> = {
  blue: {
    backgroundClassName: 'bg-blue-50',
    textClassName: 'text-blue-600',
  },
  green: {
    backgroundClassName: 'bg-green-50',
    textClassName: 'text-green-600',
  },
  gray: {
    backgroundClassName: 'bg-gray-50',
    textClassName: 'text-gray-600',
  },
  red: {
    backgroundClassName: 'bg-red-50',
    textClassName: 'text-red-600',
  },
};

export function getEnhancedSseSummaryCardClassNames(color: EnhancedSseSummaryColor) {
  return ENHANCED_SSE_SUMMARY_CARD_CLASSES[color];
}
