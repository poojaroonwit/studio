/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  
  // Use a custom dist directory to avoid Windows file locking on .next
  distDir: '.next-build',
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  
  // Increase body size limit for large file uploads
  experimental: {
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
  
  // Configure headers for CORS and security
  async headers() {
    return [
      {
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
        ],
      },
    ];
  },
  
  // Image configuration
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
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Prevent client bundle from trying to polyfill Node core modules
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
    
    // Fix for 'tg' initialization error - prevent problematic variable names in minification
    if (!isServer && config.optimization && config.optimization.minimizer) {
      config.optimization.minimizer.forEach((minimizer) => {
        if (minimizer.constructor.name === 'TerserPlugin') {
          minimizer.options.terserOptions = {
            ...minimizer.options.terserOptions,
            mangle: {
              ...minimizer.options.terserOptions?.mangle,
              reserved: ['tg', 'ee', 'tt', 'nn', 'rr', 'ss', 'uu', 'vv', 'ww', 'xx', 'yy', 'zz']
            }
          };
        }
      });
    }
    
    return config;
  },
};

module.exports = nextConfig;