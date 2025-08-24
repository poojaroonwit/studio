module.exports = {
  apps: [
    {
      name: 'upload-queue-processor',
      script: 'scripts/process-upload-queue.cjs',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/processor-error.log',
      out_file: './logs/processor-out.log',
      log_file: './logs/processor-combined.log',
      time: true,
      // Restart if process crashes
      max_restarts: 10,
      min_uptime: '10s',
      // Check if process is alive every 30 seconds
      cron_restart: '*/30 * * * * *'
    }
  ]
};
