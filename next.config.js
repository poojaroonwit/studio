/** @type {import('next').NextConfig} */
const process = require('process');

// Polyfill for self global to fix build issues
if (typeof global !== 'undefined' && !global.self) {
  global.self = global;
}

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
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  // Enable standalone output for Docker optimization
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Increase body size limit for large file uploads (500MB)
  experimental: {
    optimizeCss: false, // Disabled to reduce memory usage during build
    // optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'], // Disabled due to self reference issue
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  
  // Force Node.js runtime for all API routes to avoid Edge Runtime issues
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  
  // Optimize page loading and caching
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 4, // Increased from 2 to 4 for better navigation
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
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          // Performance headers
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      // Cache static assets
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache images
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
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
        port: '9001',
        pathname: '/studio-production/settings/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
        port: '9001',
        pathname: '/uploads/**',
      },
      getMinioRemotePattern(),
    ],
    // Performance optimizations for images
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Increase build timeout and handle static generation issues
  staticPageGenerationTimeout: 120, // 2 minutes instead of default 60 seconds
  
  // Webpack configuration to handle build issues and optimize performance
  webpack: (config, { isServer, dev }) => {
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
    }

    // Fix for NextAuth jose.js vendor chunk issue
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['jose'] = require.resolve('jose');
    
    // Optimize for memory usage during build
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          chunks: 'all',
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
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