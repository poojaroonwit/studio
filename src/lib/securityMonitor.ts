import { logAudit } from '@/lib/auditLog';
import { getPool } from '@/lib/db';

/**
 * Security monitoring and alerting system
 */

interface SecurityEvent {
  type: 'brute_force' | 'suspicious_activity' | 'rate_limit_exceeded' | 'invalid_session' | 'permission_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ip?: string;
  userAgent?: string;
  details: any;
  timestamp: Date;
}

interface SecurityAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  details: any;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
}

// In-memory store for security events (in production, use Redis or database)
const securityEvents: SecurityEvent[] = [];
const securityAlerts: SecurityAlert[] = [];

// Security thresholds
const SECURITY_THRESHOLDS = {
  BRUTE_FORCE_ATTEMPTS: 5,
  RATE_LIMIT_EXCEEDED: 10,
  SUSPICIOUS_REQUESTS: 20,
  INVALID_SESSIONS: 15,
  PERMISSION_VIOLATIONS: 10,
};

// Time windows for monitoring (in milliseconds)
const TIME_WINDOWS = {
  BRUTE_FORCE: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT: 60 * 1000, // 1 minute
  SUSPICIOUS: 60 * 60 * 1000, // 1 hour
  INVALID_SESSION: 30 * 60 * 1000, // 30 minutes
  PERMISSION: 60 * 60 * 1000, // 1 hour
};

/**
 * Record a security event
 */
export async function recordSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): Promise<void> {
  const securityEvent: SecurityEvent = {
    ...event,
    timestamp: new Date(),
  };

  securityEvents.push(securityEvent);

  // Keep only last 1000 events to prevent memory issues
  if (securityEvents.length > 1000) {
    securityEvents.splice(0, securityEvents.length - 1000);
  }

  // Log the security event
  await logAudit(
    'WARN',
    `Security event: ${event.type} - ${event.severity}`,
    'Security:Event',
    event.userId || null,
    event.details
  );

  // Check for security patterns and create alerts
  await checkSecurityPatterns(securityEvent);
}

/**
 * Check for security patterns and create alerts
 */
async function checkSecurityPatterns(event: SecurityEvent): Promise<void> {
  const now = Date.now();
  const windowStart = now - getTimeWindow(event.type);

  // Count events in the time window
  const recentEvents = securityEvents.filter(e => 
    e.type === event.type && 
    e.timestamp.getTime() > windowStart &&
    (event.ip ? e.ip === event.ip : true) &&
    (event.userId ? e.userId === event.userId : true)
  );

  const threshold = getThreshold(event.type);
  
  if (recentEvents.length >= threshold) {
    await createSecurityAlert({
      type: event.type,
      severity: getAlertSeverity(event.type, recentEvents.length),
      message: getAlertMessage(event.type, recentEvents.length),
      details: {
        eventType: event.type,
        eventCount: recentEvents.length,
        timeWindow: getTimeWindow(event.type),
        threshold,
        userId: event.userId,
        ip: event.ip,
        userAgent: event.userAgent,
        recentEvents: recentEvents.slice(-5), // Last 5 events
      },
    });
  }
}

/**
 * Create a security alert
 */
async function createSecurityAlert(alert: Omit<SecurityAlert, 'id' | 'timestamp' | 'acknowledged' | 'resolved'>): Promise<void> {
  const securityAlert: SecurityAlert = {
    ...alert,
    id: generateAlertId(),
    timestamp: new Date(),
    acknowledged: false,
    resolved: false,
  };

  securityAlerts.push(securityAlert);

  // Log the security alert
  await logAudit(
    'ERROR',
    `Security alert: ${alert.type} - ${alert.severity} - ${alert.message}`,
    'Security:Alert',
    null,
    alert.details
  );

  // In production, you might want to send notifications here
  // await sendSecurityNotification(securityAlert);
}

/**
 * Get security events for monitoring
 */
export function getSecurityEvents(
  type?: string,
  severity?: string,
  limit: number = 100
): SecurityEvent[] {
  let filtered = securityEvents;

  if (type) {
    filtered = filtered.filter(e => e.type === type);
  }

  if (severity) {
    filtered = filtered.filter(e => e.severity === severity);
  }

  return filtered
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * Get security alerts
 */
export function getSecurityAlerts(
  acknowledged?: boolean,
  resolved?: boolean,
  limit: number = 50
): SecurityAlert[] {
  let filtered = securityAlerts;

  if (acknowledged !== undefined) {
    filtered = filtered.filter(a => a.acknowledged === acknowledged);
  }

  if (resolved !== undefined) {
    filtered = filtered.filter(a => a.resolved === resolved);
  }

  return filtered
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * Acknowledge a security alert
 */
export async function acknowledgeSecurityAlert(alertId: string, userId: string): Promise<boolean> {
  const alert = securityAlerts.find(a => a.id === alertId);
  if (!alert) {
    return false;
  }

  alert.acknowledged = true;
  
  await logAudit(
    'AUDIT',
    `Security alert acknowledged: ${alertId}`,
    'Security:Alert',
    userId,
    { alertId, alertType: alert.type }
  );

  return true;
}

/**
 * Resolve a security alert
 */
export async function resolveSecurityAlert(alertId: string, userId: string): Promise<boolean> {
  const alert = securityAlerts.find(a => a.id === alertId);
  if (!alert) {
    return false;
  }

  alert.resolved = true;
  
  await logAudit(
    'AUDIT',
    `Security alert resolved: ${alertId}`,
    'Security:Alert',
    userId,
    { alertId, alertType: alert.type }
  );

  return true;
}

/**
 * Get security statistics
 */
export function getSecurityStats(): {
  totalEvents: number;
  totalAlerts: number;
  unacknowledgedAlerts: number;
  unresolvedAlerts: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
} {
  const now = Date.now();
  const last24Hours = now - (24 * 60 * 60 * 1000);
  
  const recentEvents = securityEvents.filter(e => e.timestamp.getTime() > last24Hours);
  
  const eventsByType: Record<string, number> = {};
  const eventsBySeverity: Record<string, number> = {};
  
  recentEvents.forEach(event => {
    eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
  });

  return {
    totalEvents: securityEvents.length,
    totalAlerts: securityAlerts.length,
    unacknowledgedAlerts: securityAlerts.filter(a => !a.acknowledged).length,
    unresolvedAlerts: securityAlerts.filter(a => !a.resolved).length,
    eventsByType,
    eventsBySeverity,
  };
}

// Helper functions
function getTimeWindow(eventType: string): number {
  switch (eventType) {
    case 'brute_force': return TIME_WINDOWS.BRUTE_FORCE;
    case 'rate_limit_exceeded': return TIME_WINDOWS.RATE_LIMIT;
    case 'suspicious_activity': return TIME_WINDOWS.SUSPICIOUS;
    case 'invalid_session': return TIME_WINDOWS.INVALID_SESSION;
    case 'permission_violation': return TIME_WINDOWS.PERMISSION;
    default: return 60 * 60 * 1000; // 1 hour default
  }
}

function getThreshold(eventType: string): number {
  switch (eventType) {
    case 'brute_force': return SECURITY_THRESHOLDS.BRUTE_FORCE_ATTEMPTS;
    case 'rate_limit_exceeded': return SECURITY_THRESHOLDS.RATE_LIMIT_EXCEEDED;
    case 'suspicious_activity': return SECURITY_THRESHOLDS.SUSPICIOUS_REQUESTS;
    case 'invalid_session': return SECURITY_THRESHOLDS.INVALID_SESSIONS;
    case 'permission_violation': return SECURITY_THRESHOLDS.PERMISSION_VIOLATIONS;
    default: return 10;
  }
}

function getAlertSeverity(eventType: string, count: number): 'low' | 'medium' | 'high' | 'critical' {
  const threshold = getThreshold(eventType);
  
  if (count >= threshold * 3) return 'critical';
  if (count >= threshold * 2) return 'high';
  if (count >= threshold * 1.5) return 'medium';
  return 'low';
}

function getAlertMessage(eventType: string, count: number): string {
  switch (eventType) {
    case 'brute_force':
      return `Brute force attack detected: ${count} failed login attempts`;
    case 'rate_limit_exceeded':
      return `Rate limit exceeded: ${count} requests in time window`;
    case 'suspicious_activity':
      return `Suspicious activity detected: ${count} suspicious requests`;
    case 'invalid_session':
      return `Invalid session attempts: ${count} invalid session requests`;
    case 'permission_violation':
      return `Permission violations: ${count} unauthorized access attempts`;
    default:
      return `Security event detected: ${count} occurrences`;
  }
}

function generateAlertId(): string {
<<<<<<< HEAD
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
=======
  // Use crypto for secure random ID generation
  let randomPart: string;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    randomPart = crypto.randomUUID().replace(/-/g, '').substring(0, 9);
  } else {
    randomPart = Math.random().toString(36).substr(2, 9);
  }
  return `alert_${Date.now()}_${randomPart}`;
>>>>>>> ca51ac36
}

/**
 * Clean up old security events and alerts
 */
export async function cleanupSecurityData(): Promise<void> {
  const now = Date.now();
  const retentionPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  // Remove old events
  const eventIndex = securityEvents.findIndex(e => 
    now - e.timestamp.getTime() > retentionPeriod
  );
  if (eventIndex > 0) {
    securityEvents.splice(0, eventIndex);
  }
  
  // Remove old resolved alerts
  const alertIndex = securityAlerts.findIndex(a => 
    a.resolved && (now - a.timestamp.getTime() > retentionPeriod)
  );
  if (alertIndex > 0) {
    securityAlerts.splice(0, alertIndex);
  }
  
  await logAudit(
    'AUDIT',
    'Security data cleanup completed',
    'Security:Cleanup',
    null,
    { 
      eventsRemaining: securityEvents.length,
      alertsRemaining: securityAlerts.length
    }
  );
}

// Run cleanup every hour
setInterval(cleanupSecurityData, 60 * 60 * 1000);
