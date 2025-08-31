# Dynamic Resource Management System

## Overview

The application now includes a comprehensive **Dynamic Resource Management System** that automatically monitors system resources (CPU, memory, database connections) and dynamically adjusts application behavior based on available resources. This prevents the application from getting stuck and ensures optimal performance under varying load conditions.

## Key Features

### 🔄 **Automatic Resource Monitoring**
- **Real-time CPU monitoring** - Tracks CPU usage and system load
- **Memory usage tracking** - Monitors heap usage and total memory consumption
- **Database connection health** - Tracks active connections and pool health
- **Network performance** - Monitors response times and active requests

### ⚙️ **Dynamic Configuration Adjustment**
- **Processing intervals** - Automatically adjusts based on system pressure
- **Batch sizes** - Scales up/down based on available resources
- **Timeout multipliers** - Increases timeouts under high load
- **Retry attempts** - Adjusts retry logic based on system health
- **Concurrent request limits** - Scales based on resource availability

### 📊 **Resource Pressure Levels**
- **Low Pressure** (0-30%): Optimal performance, can increase workload
- **Medium Pressure** (30-60%): Normal operation, balanced settings
- **High Pressure** (60-80%): Reduced performance, conservative settings
- **Critical Pressure** (80%+): Minimal operation, emergency settings

## System Architecture

### 1. **Resource Monitor** (`src/lib/resource-monitor.ts`)
The core monitoring system that:
- Collects system metrics every 30 seconds
- Calculates resource health scores
- Determines pressure levels
- Adjusts configuration dynamically
- Notifies components of changes

### 2. **Dynamic Configuration Hook** (`src/hooks/use-dynamic-config.ts`)
React hook that provides:
- Real-time configuration updates
- Resource pressure information
- Performance recommendations
- Use-case specific configurations

### 3. **Resource Status API** (`src/app/api/system/resource-status/route.ts`)
API endpoint that provides:
- Current system metrics
- Dynamic configuration status
- Performance recommendations
- Configuration update capabilities

### 4. **UI Status Indicator** (`src/components/ui/ResourceStatusIndicator.tsx`)
Visual component that displays:
- System health score
- Resource pressure level
- Current configuration
- Performance recommendations

## Dynamic Adjustments

### Processing Behavior
| Pressure Level | Interval | Batch Size | Timeout | Retries |
|----------------|----------|------------|---------|---------|
| **Low** | -20% | +20% | -20% | -20% |
| **Medium** | Normal | Normal | Normal | Normal |
| **High** | +50% | -20% | +50% | +20% |
| **Critical** | +150% | -50% | +100% | +50% |

### UI Behavior
| Pressure Level | Debounce | Update Interval | Max Renders |
|----------------|----------|-----------------|-------------|
| **Low** | 200ms | 1000ms | 200 |
| **Medium** | 200ms | 1000ms | 200 |
| **High** | 500ms | 3000ms | 100 |
| **Critical** | 1000ms | 5000ms | 50 |

## Implementation Examples

### Using Dynamic Configuration in Components

```typescript
import { useDynamicConfig } from '@/hooks/use-dynamic-config';

function MyComponent() {
  const { 
    pressure, 
    healthScore, 
    getConfigFor, 
    isUnderPressure 
  } = useDynamicConfig();

  const apiConfig = getConfigFor('api');
  const uiConfig = getConfigFor('ui');

  // Use dynamic timeouts
  const fetchData = async () => {
    const response = await fetch('/api/data', {
      signal: AbortSignal.timeout(apiConfig.timeout)
    });
  };

  // Use dynamic debouncing
  const debouncedUpdate = useMemo(
    () => debounce(updateData, uiConfig.debounceDelay),
    [uiConfig.debounceDelay]
  );

  return (
    <div>
      {isUnderPressure && (
        <Alert>
          System under pressure - operations may be slower
        </Alert>
      )}
    </div>
  );
}
```

### Upload Queue Processor with Dynamic Management

The upload queue processor (`scripts/process-upload-queue.cjs`) now:
- Monitors CPU and memory usage every 30 seconds
- Adjusts processing intervals based on system pressure
- Scales batch sizes dynamically
- Increases timeouts under high load
- Provides detailed resource logging

```javascript
// Dynamic configuration adjustment
function updateDynamicConfig() {
  const metrics = getSystemMetrics();
  const pressure = calculateResourcePressure(metrics);
  
  if (pressure !== currentPressureLevel) {
    const newConfig = adjustConfiguration(pressure);
    Object.assign(dynamicConfig, newConfig);
    
    console.log(`📊 Resource pressure: ${pressure}`);
    console.log(`⚙️  Adjusted config:`, newConfig);
  }
}
```

## Monitoring and Debugging

### Resource Status API
```bash
# Get current resource status
GET /api/system/resource-status

# Update configuration
POST /api/system/resource-status
{
  "baseConfig": {
    "processingInterval": 15000,
    "batchSize": 5
  },
  "thresholds": {
    "cpu": { "warning": 75, "critical": 90 }
  }
}
```

### Resource Status Component
```tsx
import { ResourceStatusIndicator } from '@/components/ui/ResourceStatusIndicator';

function SystemStatusPage() {
  return (
    <div>
      <ResourceStatusIndicator 
        showDetails={true}
        showRecommendations={true}
      />
    </div>
  );
}
```

### Console Logging
The system provides detailed console logging:
```
🔄 Starting dynamic resource monitoring
📊 Resource pressure: medium (75.2%)
⚙️  Adjusted config: {
  interval: "10000ms",
  batchSize: 3,
  maxConcurrent: 5,
  timeoutMult: "1.00",
  retries: 3
}
```

## Configuration Options

### Environment Variables
```bash
# Base processing interval (ms)
PROCESSOR_INTERVAL_MS=10000

# Base batch size
PROCESSOR_BATCH_LIMIT=3

# Connection timeout (ms)
PROCESSOR_CONNECTION_TIMEOUT_MS=60000

# Request timeout (ms)
PROCESSOR_REQUEST_TIMEOUT_MS=180000

# Health check interval (ms)
PROCESSOR_HEALTH_CHECK_INTERVAL=30000
```

### Threshold Configuration
```typescript
// CPU thresholds
cpu: { warning: 70, critical: 90 }

// Memory thresholds  
memory: { warning: 80, critical: 95 }

// Database thresholds
database: { warning: 70, critical: 90 }
```

## Benefits

### 🚀 **Performance Optimization**
- Automatically scales up when resources are available
- Prevents resource exhaustion
- Optimizes throughput based on system capacity

### 🛡️ **Stability Protection**
- Prevents application from getting stuck
- Reduces memory pressure
- Manages database connection pools

### 📈 **Adaptive Behavior**
- Responds to changing system conditions
- Self-healing under load
- Graceful degradation during high pressure

### 🔍 **Visibility**
- Real-time resource monitoring
- Performance recommendations
- Detailed logging and metrics

## Integration Points

### Existing Systems Enhanced
1. **Upload Queue Processor** - Now dynamically adjusts processing
2. **API Endpoints** - Use dynamic timeouts and retry logic
3. **UI Components** - Adapt debouncing and update frequencies
4. **Database Operations** - Scale based on connection pool health

### New Monitoring Capabilities
1. **Resource Status Dashboard** - Visual system health monitoring
2. **API Monitoring** - Real-time resource metrics
3. **Performance Alerts** - Automatic recommendations
4. **Configuration Management** - Dynamic threshold adjustment

## Future Enhancements

### Planned Features
- **Machine Learning Integration** - Predictive resource scaling
- **Historical Analytics** - Resource usage patterns
- **Alert System** - Proactive performance notifications
- **Auto-scaling** - Automatic infrastructure scaling
- **Custom Metrics** - Application-specific resource tracking

### Advanced Monitoring
- **Network Latency** - End-to-end performance tracking
- **Database Query Performance** - Query optimization recommendations
- **Memory Leak Detection** - Automatic memory leak identification
- **Performance Profiling** - Detailed performance analysis

## Troubleshooting

### Common Issues
1. **High Resource Pressure** - Check for memory leaks or CPU-intensive operations
2. **Configuration Not Updating** - Verify resource monitor is running
3. **Performance Degradation** - Review pressure level and recommendations
4. **API Timeouts** - Check dynamic timeout configuration

### Debug Commands
```bash
# Check resource status
curl /api/system/resource-status

# Monitor processor logs
npm run processor:pm2:logs

# Test resource monitoring
node scripts/test-application-stuck-fix.js
```

This dynamic resource management system ensures the application remains responsive and stable under all conditions while automatically optimizing performance based on available system resources.
