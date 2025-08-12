/** @type {import('next').NextConfig} */
const process = require('process');

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
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
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