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
  webpack: (config, { isServer, dev }) => {
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
    
    // Comprehensive fix for 'tg' initialization error (TDZ)
    if (!isServer) {
      // 1. Disable minification in development to avoid TDZ issues
      if (dev) {
        config.optimization = config.optimization || {};
        config.optimization.minimize = false;
      } else {
        // 2. In production, use safer minification settings
        config.optimization = config.optimization || {};
        config.optimization.splitChunks = {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            // Separate React/Next.js core modules to prevent TDZ issues
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react-vendor',
              chunks: 'all',
              priority: 10,
            },
            nextjs: {
              test: /[\\/]node_modules[\\/](next|@next)[\\/]/,
              name: 'nextjs-vendor', 
              chunks: 'all',
              priority: 9,
            },
            // Separate context providers to prevent circular dependencies
            contexts: {
              test: /[\\/]src[\\/]contexts[\\/]/,
              name: 'contexts',
              chunks: 'all',
              priority: 8,
            },
          },
        };
        
        // 3. Configure minification to be safer
        if (config.optimization.minimizer) {
          config.optimization.minimizer.forEach((minimizer) => {
            if (minimizer.constructor.name === 'TerserPlugin') {
              minimizer.options = {
                ...minimizer.options,
                terserOptions: {
                  ...minimizer.options.terserOptions,
                  // Keep function names to prevent TDZ issues with arrow functions
                  keep_fnames: true,
                  // Keep class names
                  keep_classnames: true,
                  // More conservative mangle settings
                  mangle: {
                    ...minimizer.options.terserOptions?.mangle,
                    // Reserve problematic variable names
                    reserved: ['tg', 'ee', 'tt', 'nn', 'rr', 'ss', 'uu', 'vv', 'ww', 'xx', 'yy', 'zz'],
                    // Don't mangle top-level variables
                    toplevel: false,
                    // Keep original variable names for safer initialization
                    safari10: true,
                  },
                  // Safer compression settings
                  compress: {
                    ...minimizer.options.terserOptions?.compress,
                    // Don't hoist variables that might cause TDZ
                    hoist_vars: false,
                    // Don't collapse variables that might cause TDZ
                    collapse_vars: false,
                    // Don't reduce variables that might cause TDZ
                    reduce_vars: false,
                    // Keep function expressions as-is
                    keep_fargs: true,
                    // Keep initialization order
                    sequences: false,
                  },
                };
              }
            }
          });
        }
      }
    }
    
    return config;
  },
};

module.exports = nextConfig;