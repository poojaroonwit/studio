# Container Debug Features

This document describes the new container-specific debug functionality that has been added to the system debug overlay.

## Overview

The system debug overlay now includes comprehensive container monitoring capabilities, allowing administrators to view real-time information about Docker containers, their resource usage, and system status.

## Features

### 1. Basic Container Information
- **Container Count**: Total and running container counts
- **Container Status**: Real-time status of each container
- **Port Mapping**: Port bindings for each container
- **Basic Health**: Quick overview of container health

### 2. Detailed Container Metrics
- **Resource Usage**: CPU, memory, and network I/O statistics
- **Container Details**: Image, command, creation time, and process count
- **Performance Monitoring**: Real-time resource consumption tracking
- **Network Statistics**: Inbound and outbound network traffic

### 3. Docker System Information
- **Docker Version**: Current Docker daemon version
- **System Resources**: Total memory and disk space available to Docker
- **Container Management**: Total containers and images count

## API Endpoints

### `/api/system/container-metrics`
**GET** - Retrieves detailed container metrics and Docker system information

**Authentication**: Required (Admin permissions: `USERS_PERMISSIONS_MANAGE`)

**Response**:
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "containers": [
    {
      "id": "container_id",
      "name": "container_name",
      "status": "running",
      "image": "image:tag",
      "ports": "80->8080, 443->8443",
      "cpu": {
        "usage": "2.5%",
        "percentage": 2.5
      },
      "memory": {
        "usage": "128MB / 512MB",
        "percentage": 25.0
      },
      "network": {
        "rx": "1.2MB",
        "tx": "856KB"
      },
      "disk": {
        "io": "12.5MB / 8.2MB"
      },
      "processes": 15
    }
  ],
  "dockerInfo": {
    "version": "24.0.7",
    "containers": 5,
    "images": 12,
    "system": {
      "totalMemory": "16GB",
      "totalDisk": "500GB"
    }
  }
}
```

### `/api/system/metrics` (Enhanced)
**GET** - Now includes basic container information in addition to system metrics

**New Container Section**:
```json
{
  "containers": {
    "total": 5,
    "running": 4,
    "containers": [
      {
        "name": "app",
        "status": "Up 2 hours",
        "ports": "8021->8021"
      }
    ]
  }
}
```

## Usage

### 1. Accessing the Debug Overlay
- Press `Ctrl+Shift+D` to toggle the system debug overlay
- The overlay will appear in the top-left corner by default
- Drag to move the overlay around the screen
- Use the pin button to keep it visible

### 2. Viewing Container Information
- **Basic View**: Container count and status are always visible
- **Detailed View**: Click the `+` button next to the container count to expand
- **Auto-refresh**: Metrics update every 5 seconds automatically

### 3. Container Status Indicators
- **Green Badge**: Container is running normally
- **Yellow Badge**: Container has issues or is in a transitional state
- **Red Badge**: Container is stopped or has errors

## Requirements

### System Requirements
- Docker daemon must be running and accessible
- User must have admin permissions (`USERS_PERMISSIONS_MANAGE`)
- Docker CLI must be available in the system PATH

### Container Access
- The application must have access to execute Docker commands
- Docker socket access may be required depending on configuration
- Container metrics are collected using `docker stats` and `docker inspect`

## Security Considerations

### Authentication
- All container metrics endpoints require authentication
- Admin-level permissions are required to access container information
- Session validation is performed on each request

### Data Exposure
- Container names and images are visible to authorized users
- Resource usage statistics are real-time and may contain sensitive information
- Port bindings and network information are displayed

### Access Control
- Container metrics are only available to users with `USERS_PERMISSIONS_MANAGE` permission
- Consider restricting access to production environments
- Monitor access logs for security auditing

## Troubleshooting

### Common Issues

#### 1. "Docker not accessible" Error
**Cause**: Docker daemon is not running or not accessible
**Solution**: 
- Verify Docker is running: `docker info`
- Check Docker socket permissions
- Ensure the application has access to Docker commands

#### 2. Permission Denied Errors
**Cause**: Insufficient permissions to access Docker
**Solution**:
- Add user to docker group: `sudo usermod -aG docker $USER`
- Restart the application after permission changes
- Check Docker socket ownership and permissions

#### 3. Container Metrics Not Updating
**Cause**: Docker commands failing or timing out
**Solution**:
- Check Docker daemon health: `docker system info`
- Verify container names and IDs are accessible
- Check system resources (Docker may be resource-constrained)

#### 4. Performance Impact
**Cause**: Frequent Docker command execution
**Solution**:
- Metrics refresh interval is configurable (currently 5 seconds)
- Consider increasing interval for high-traffic environments
- Monitor system performance during debug overlay usage

### Debug Commands

#### Test Container Metrics Endpoint
```bash
npm run test:container-metrics
```

#### Manual Docker Commands
```bash
# Check Docker status
docker info

# View running containers
docker ps

# Get container stats
docker stats --no-stream

# Inspect specific container
docker inspect <container_id>
```

## Configuration

### Environment Variables
No additional environment variables are required for container metrics functionality.

### Docker Configuration
- Ensure Docker daemon is accessible
- Verify container names are consistent and accessible
- Check Docker network configuration for container communication

### Performance Tuning
- Adjust metrics refresh interval if needed
- Monitor Docker daemon performance
- Consider resource limits for container metrics collection

## Future Enhancements

### Planned Features
- Container log streaming
- Resource usage alerts and thresholds
- Container restart/stop controls
- Performance trend analysis
- Custom metric collection

### Integration Possibilities
- Prometheus metrics export
- Grafana dashboard integration
- Container health monitoring
- Automated container management

## Support

For issues or questions regarding container debug features:
1. Check the troubleshooting section above
2. Review Docker daemon logs
3. Verify user permissions and authentication
4. Test Docker CLI access manually
5. Contact system administrator for Docker configuration issues
