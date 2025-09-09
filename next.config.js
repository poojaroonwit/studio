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
      // 1. Disable minification completely to avoid TDZ issues
      config.optimization = config.optimization || {};
      config.optimization.minimize = false;
      
      // 2. Disable all optimizations that could cause TDZ issues
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Separate React/Next.js core modules to prevent TDZ issues
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react-vendor',
            chunks: 'all',
            priority: 10,
            enforce: true,
          },
          nextjs: {
            test: /[\\/]node_modules[\\/](next|@next)[\\/]/,
            name: 'nextjs-vendor', 
            chunks: 'all',
            priority: 9,
            enforce: true,
          },
          // Separate context providers to prevent circular dependencies
          contexts: {
            test: /[\\/]src[\\/]contexts[\\/]/,
            name: 'contexts',
            chunks: 'all',
            priority: 8,
            enforce: true,
          },
          // Separate UI components
          ui: {
            test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
            name: 'ui-components',
            chunks: 'all',
            priority: 7,
            enforce: true,
          },
          // Separate candidate components to prevent TDZ issues
          candidates: {
            test: /[\\/]src[\\/]components[\\/]candidates[\\/]/,
            name: 'candidate-components',
            chunks: 'all',
            priority: 6,
            enforce: true,
          },
          // Separate position components to prevent TDZ issues
          positions: {
            test: /[\\/]src[\\/]components[\\/]positions[\\/]/,
            name: 'position-components',
            chunks: 'all',
            priority: 5,
            enforce: true,
          },
        },
      };
      
      // 3. Disable all minification plugins
      config.optimization.minimizer = [];
      
      // 4. Add module concatenation prevention
      config.optimization.concatenateModules = false;
      
      // 5. Disable side effects optimization
      config.optimization.sideEffects = false;
    }
    
    return config;
  },
};

module.exports = nextConfig;