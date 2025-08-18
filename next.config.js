/** @type {import('next').NextConfig} */
const process = require('process');

// Suppress Fast Refresh logs
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;

// Override console methods to filter out Fast Refresh logs
console.log = (...args) => {
  const message = args.join(' ');
  if (!message.includes('[Fast Refresh]')) {
    originalConsoleLog(...args);
  }
};

console.info = (...args) => {
  const message = args.join(' ');
  if (!message.includes('[Fast Refresh]')) {
    originalConsoleInfo(...args);
  }
};

function getMinioRemotePattern() {
  // Try to get MinIO public URL and bucket from env
  const minioUrl = process.env.NEXT_PUBLIC_MINIO_URL || 'http://localhost:8621';
  const minioBucket = process.env.NEXT_PUBLIC_MINIO_BUCKET || 'studio-production';
  try {
    const url = new URL(minioUrl);
    return {
      protocol: url.protocol.replace(':', ''),
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? '443' : '80'),
      pathname: `/${minioBucket}/settings/**`,
    };
  } catch (e) {
    // fallback to localhost
    return {
      protocol: 'http',
      hostname: 'localhost',
      port: '8621',
      pathname: '/studio-production/settings/**',
    };
  }
}

const nextConfig = {
  reactStrictMode: true,
  // Disable static generation for API routes that use dynamic features
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs', 'pg'],
  },
  // Disable Fast Refresh logs
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // Disable static export to prevent timeout issues
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
  // Disable static generation to prevent timeout issues
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },

  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
        ],
      },
    ];
  },
  images: {
    domains: ['localhost', '127.0.0.1'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8621',
        pathname: '/studio-production/settings/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
        port: '9000',
        pathname: '/uploads/**',
      },
      getMinioRemotePattern(),
    ],
  },
  // Increase build timeout and handle static generation issues
  staticPageGenerationTimeout: 120, // 2 minutes instead of default 60 seconds
  // Webpack configuration to handle build issues
  webpack: (config, { isServer, dev }) => {
    // Handle build-time connection issues
    if (!dev && isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'minio': 'commonjs minio',
      });
    }
    
    // Prevent client bundle from trying to polyfill Node core modules used by pg
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        net: false,
        tls: false,
        dns: false,
      };
      // Ensure pg and related libs are not bundled into the client
      config.externals = config.externals || [];
      config.externals.push({
        pg: 'commonjs pg',
        'pg-connection-string': 'commonjs pg-connection-string',
      });
    }

    // Suppress Fast Refresh logs in development
    if (dev) {
      config.infrastructureLogging = {
        level: 'error',
      };
    }
    
    return config;
  },
  // Disable static optimization for API routes that might cause issues
  async rewrites() {
    return [
      {
        source: '/api/health',
        destination: '/api/health',
      },
    ];
  },
};

module.exports = nextConfig; 