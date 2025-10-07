/**
 * Security configuration for the application
 */

export const securityConfig = {
  // Password requirements
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90, // days
    historyCount: 5, // remember last 5 passwords
  },
  
  // Session configuration
  session: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    updateAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: true, // require HTTPS
    httpOnly: true, // prevent XSS
    sameSite: 'strict' as const, // CSRF protection
  },
  
  // Rate limiting
  rateLimits: {
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 login attempts
    },
    api: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // 100 requests
    },
    upload: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10, // 10 uploads
    },
    search: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30, // 30 searches
    },
  },
  
  // File upload limits
  fileUpload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ],
    allowedExtensions: [
      '.pdf', '.doc', '.docx', '.txt', '.rtf',
      '.jpg', '.jpeg', '.png', '.gif', '.bmp',
      '.xlsx', '.xls', '.csv',
    ],
  },
  
  // Security headers
  headers: {
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://fonts.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "http://localhost:9001"],
      connectSrc: ["'self'", "http://localhost:9001"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
      interestCohort: [],
    },
  },
  
  // Input validation
  validation: {
    maxStringLength: 10000,
    maxArrayLength: 1000,
    maxObjectDepth: 10,
    allowedHtmlTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
    blockedPatterns: [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /union\s+select/i,
      /drop\s+table/i,
      /delete\s+from/i,
      /insert\s+into/i,
      /update\s+set/i,
      /create\s+table/i,
      /alter\s+table/i,
      /exec\s*\(/i,
      /execute\s*\(/i,
    ],
  },
  
  // Audit logging
  audit: {
    enabled: true,
    logLevels: ['AUDIT', 'WARN', 'ERROR'],
    sensitiveFields: ['password', 'token', 'secret', 'key'],
    maxLogSize: 100 * 1024 * 1024, // 100MB
    retentionDays: 90,
  },
  
  // Encryption
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16,
  },
  
  // CORS configuration
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.NEXTAUTH_URL || 'https://yourdomain.com']
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },
  
  // Database security
  database: {
    connectionTimeout: 30000, // 30 seconds
    queryTimeout: 30000, // 30 seconds
    maxConnections: 20,
    ssl: process.env.NODE_ENV === 'production',
  },
  
  // Environment-specific settings
  environment: {
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    isTest: process.env.NODE_ENV === 'test',
  },
};

// Helper functions for security configuration
export function getSecurityHeader(name: string): string | undefined {
  const headers = securityConfig.headers;
  
  switch (name) {
    case 'Content-Security-Policy':
      const csp = headers.contentSecurityPolicy;
      return Object.entries(csp)
        .map(([key, values]) => `${key} ${values.join(' ')}`)
        .join('; ');
        
    case 'Permissions-Policy':
      const pp = headers.permissionsPolicy;
      return Object.entries(pp)
        .map(([key, values]) => `${key}=(${values.join(' ')})`)
        .join(', ');
        
    default:
      return undefined;
  }
}

export function isAllowedFileType(mimetype: string, filename: string): boolean {
  const { allowedTypes, allowedExtensions } = securityConfig.fileUpload;
  
  // Check MIME type
  if (!allowedTypes.includes(mimetype)) {
    return false;
  }
  
  // Check file extension
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  if (!allowedExtensions.includes(extension)) {
    return false;
  }
  
  return true;
}

export function isBlockedPattern(input: string): boolean {
  const { blockedPatterns } = securityConfig.validation;
  return blockedPatterns.some(pattern => pattern.test(input));
}

export function getRateLimitConfig(endpoint: string) {
  const { rateLimits } = securityConfig;
  
  if (endpoint.includes('/auth/') || endpoint.includes('/signin')) {
    return rateLimits.auth;
  } else if (endpoint.includes('/upload') || endpoint.includes('/file')) {
    return rateLimits.upload;
  } else if (endpoint.includes('/search') || endpoint.includes('/candidates')) {
    return rateLimits.search;
  } else {
    return rateLimits.api;
  }
}
