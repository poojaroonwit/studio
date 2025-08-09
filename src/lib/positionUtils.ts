/**
 * Utilities for position-related operations and styling
 */

export interface PositionStatusBadgeProps {
  isOpen: boolean;
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
}

/**
 * Get position status badge styling
 */
export function getPositionStatusBadge(isOpen: boolean, showIcon: boolean = true) {
  return {
    variant: isOpen ? "default" : "secondary" as const,
    className: isOpen 
      ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-200" 
      : "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
    text: showIcon 
      ? (isOpen ? "🟢 Open" : "🔴 Closed")
      : (isOpen ? "Open" : "Closed")
  };
}

/**
 * Get position status color class
 */
export function getPositionStatusColor(isOpen: boolean) {
  return isOpen ? "text-green-600" : "text-red-600";
}

/**
 * Get position status background color class
 */
export function getPositionStatusBgColor(isOpen: boolean) {
  return isOpen ? "bg-green-50" : "bg-red-50";
}

/**
 * Position status types
 */
export const POSITION_STATUS = {
  OPEN: true,
  CLOSED: false
} as const;

/**
 * Get human-readable position status
 */
export function getPositionStatusText(isOpen: boolean) {
  return isOpen ? "Open" : "Closed";
}