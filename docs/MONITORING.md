# Monitoring & Health Checks - FitScan Enterprise ATS

**Project Name:** FitScan Enterprise  
**Document Version:** 1.0  
**Date:** December 16, 2025  
**Status:** Active Development

---

## 1. Health Endpoints

### 1.1 Application Health

- **URL**: `/api/health`
- **Method**: GET
- **Response**: Application status, version, and basic metrics

### 1.2 Database Health

- **URL**: `/api/health/database`
- **Method**: GET
- **Response**: Database connection status and query performance

### 1.3 MinIO Health

- **URL**: `/api/health/minio`
- **Method**: GET
- **Response**: MinIO connection status and bucket accessibility

### 1.4 SSE Health

- **URL**: `/api/sse/health`
- **Method**: GET
- **Response**: Server-Sent Events connection status

### 1.5 V1 Health

- **URL**: `/api/v1/health`
- **Method**: GET
- **Response**: Comprehensive health check with statistics

---

## 2. Built-in Monitoring

### 2.1 System Status Page

- **URL**: `/system-status`
- **Features**:
  - Real-time system health metrics
  - Resource usage (CPU, memory, disk)
  - Service status indicators
  - Connection pool monitoring

### 2.2 Dashboard Metrics

- Real-time candidate counts
- Position statistics
- Application trends
- SLA compliance rates

### 2.3 Log Monitoring

- **URL**: `/logs` or `/settings/logs`
- **Features**:
  - System log viewer
  - Filter by level, date, user
  - Search functionality
  - Export capabilities

---

## 3. Performance Monitoring

### 3.1 Database Performance

- Query execution time tracking
- Connection pool monitoring
- Index usage analysis
- Slow query detection

### 3.2 Application Performance

- API response times
- Page load metrics
- Real-time update latency
- Background processor throughput

---

## 4. Alerting

### 4.1 SLA Violations

- **URL**: `/sla-monitoring`
- **Features**:
  - Position SLA tracking
  - Violation alerts
  - Compliance reports

### 4.2 Warning System

- **URL**: `/api/warnings`
- **Features**:
  - Data quality warnings
  - Configurable warning conditions
  - Auto-clearing warnings
  - Warning notifications

---

## 5. External Monitoring Integration

### 5.1 Health Check for Load Balancers

```bash
# Use health endpoint for load balancer health checks
curl http://your-domain:8021/api/health
```

### 5.2 Prometheus Metrics (if configured)

- Expose metrics endpoint
- Monitor application metrics
- Alert on thresholds

### 5.3 SigNoz Observability (if configured)

- Unified observability platform (logs, metrics, traces)
- Distributed tracing across services
- Performance monitoring and bottleneck identification

### 5.4 Elasticsearch Log Search (if configured)

- Advanced log search and indexing
- Full-text search with fuzzy matching
- Complex queries and filtering
- Can be used alongside SigNoz

---

## 6. Monitoring Best Practices

1. **Regular Health Checks**: Monitor health endpoints every 1-5 minutes
2. **Log Aggregation**: Centralize logs for analysis
3. **Alert Thresholds**: Set appropriate alert thresholds
4. **Performance Baselines**: Establish performance baselines
5. **Capacity Planning**: Monitor resource usage trends

---

## 7. Application Pages & Routes

### 7.1 Main Application Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Overview and analytics |
| Applicants | `/applicants` | Candidate management interface |
| Candidates | `/candidates` | Alternative candidate view |
| Positions | `/positions` | Position management |
| My Tasks | `/my-tasks` | Personal task board for recruiters |
| Process Queue | `/process-queue` | Upload queue monitoring |
| SLA Monitoring | `/sla-monitoring` | Service Level Agreement tracking |
| System Status | `/system-status` | System health monitoring |
| Users | `/users` | User management |
| Logs | `/logs` | System logs viewer |
| Settings | `/settings` | System configuration hub |

### 7.2 Settings Pages

| Page | Route | Description |
|------|-------|-------------|
| System Settings | `/settings/system-settings` | Core system configuration |
| System Preferences | `/settings/system-preferences` | Application preferences |
| User Management | `/settings/users` | User administration |
| User Groups | `/settings/user-groups` | Permission group management |
| User Teams | `/settings/user-teams` | Team organization |
| User Preferences | `/settings/user-preferences` | User-specific settings |
| Recruitment Stages | `/settings/stages` | Pipeline stage configuration |
| Custom Fields | `/settings/custom-fields` | Custom field definitions |
| Data Configuration | `/settings/data-configuration` | Data model settings |
| Evaluation Configuration | `/settings/evaluation-configuration` | Evaluation setup |
| System Prompts | `/settings/system-prompts` | AI prompt management |
| Webhooks | `/settings/webhooks` | Webhook configuration |
| Warning Configurations | `/settings/warning-configurations` | Data quality warnings |
| Recruiter Sync | `/settings/recruiter-sync` | Recruiter synchronization |
| API Documentation | `/settings/api-docs` | API documentation viewer |
| Logs | `/settings/logs` | Settings-specific logs |

### 7.3 Authentication Pages

| Page | Route | Description |
|------|-------|-------------|
| Sign In | `/auth/signin` | User authentication |

### 7.4 Documentation Pages

| Page | Route | Description |
|------|-------|-------------|
| Docs | `/docs` | Application documentation viewer |
| API Docs | `/api-docs` | Interactive API documentation |

---

## 8. Related Documentation

- [Architecture](./ARCHITECTURE.md) - System architecture overview
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions
- [Security](./SECURITY.md) - Security implementation
