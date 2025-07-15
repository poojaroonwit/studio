/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
  // Add any custom Next.js config options here
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
  images: {
    domains: ['localhost', '127.0.0.1'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8721',
        pathname: '/studio5-production/settings/**', // adjust as needed for your MinIO bucket/path
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
        'redis': 'commonjs redis',
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

export default nextConfig; 