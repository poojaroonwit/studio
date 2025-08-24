# Production Setup Guide

## Preventing Queue Stuck Issues

This guide ensures your upload queue processor runs reliably in production and automatically recovers from failures.

## 🚀 Quick Start

### Option 1: Simple Startup (Recommended)
```bash
npm run start:production
```

This starts both the queue processor and health check service automatically.

### Option 2: PM2 Management (Advanced)
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
npm run processor:pm2

# Monitor
npm run processor:pm2:logs

# Restart if needed
npm run processor:pm2:restart
```

## 🔧 Available Commands

### Queue Management
```bash
# Start queue processor
npm run processor

# Check queue status
npm run check-queue-status

# Fix stuck queue
node scripts/fix-process-queue-config.cjs
```

### Health Monitoring
```bash
# Start health check service
npm run health-check

# Monitor with PM2
npm run processor:pm2:logs
```

### Production Services
```bash
# Start all production services
npm run start:production

# Start with PM2
npm run processor:pm2
```

## 🛡️ Automatic Recovery Features

### 1. **Health Check Service**
- Monitors queue processor every minute
- Automatically restarts processor if it stops
- Resets stuck jobs after 1 hour
- Logs all activities to `./logs/health-check.log`

### 2. **PM2 Process Management**
- Auto-restart on crashes
- Memory limit protection (1GB)
- Log rotation and management
- Process monitoring

### 3. **Stuck Job Recovery**
- Jobs stuck in "inprocess" for >1 hour are automatically reset
- Prevents infinite processing loops
- Maintains queue health

## 📊 Monitoring

### Check Queue Status
```bash
npm run check-queue-status
```

### View Logs
```bash
# Health check logs
tail -f ./logs/health-check.log

# PM2 logs
npm run processor:pm2:logs
```

### Webhook Status
```bash
# Test webhook connectivity
curl -X POST "http://192.168.1.36:5678/webhook/exe-process" \
  -H "Content-Type: application/json" \
  -d '{"test":"connection"}'
```

## 🚨 Troubleshooting

### Queue Stuck Again?
1. **Check if processor is running:**
   ```bash
   npm run check-queue-status
   ```

2. **Restart services:**
   ```bash
   npm run processor:pm2:restart
   ```

3. **Fix stuck jobs:**
   ```bash
   node scripts/fix-process-queue-config.cjs
   ```

4. **Start health check:**
   ```bash
   npm run health-check
   ```

### Webhook Issues?
1. **Check webhook URL** in system settings
2. **Verify N8N is running** on the webhook server
3. **Test connectivity** to the webhook endpoint
4. **Update webhook URL** if it has changed

### Performance Issues?
1. **Reduce concurrent processors** in system settings
2. **Increase webhook timeout** if processing is slow
3. **Monitor memory usage** of the processor

## 🔄 Startup Automation

### Windows Task Scheduler
Create a scheduled task to run on startup:
```cmd
schtasks /create /tn "Studio8 Queue Processor" /tr "npm run start:production" /sc onstart /ru SYSTEM
```

### Linux Systemd Service
Create `/etc/systemd/system/studio8-processor.service`:
```ini
[Unit]
Description=Studio8 Queue Processor
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/studio-8
ExecStart=/usr/bin/npm run start:production
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable studio8-processor
sudo systemctl start studio8-processor
```

## 📈 Best Practices

1. **Always use health check service** in production
2. **Monitor logs regularly** for issues
3. **Set up alerts** for stuck jobs
4. **Test webhook connectivity** before deploying
5. **Use PM2** for process management
6. **Backup queue data** regularly
7. **Monitor system resources** (CPU, memory, disk)

## 🆘 Emergency Procedures

### Complete Queue Reset
```bash
# Stop all services
npm run processor:pm2:stop

# Reset all stuck jobs
node scripts/fix-process-queue-config.cjs

# Restart services
npm run start:production
```

### Webhook Failure
```bash
# Disable webhook temporarily
# Update system settings to disable webhook processing
# Jobs will queue but not process until webhook is fixed
```

This setup ensures your queue processor is resilient and automatically recovers from most issues.
