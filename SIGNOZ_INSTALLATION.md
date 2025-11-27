# SigNoz Installation Guide

The SigNoz Docker images are not publicly available as separate images. You need to use the official SigNoz deployment method.

## Option 1: Use Official SigNoz Installation (Recommended)

The easiest way is to use the official SigNoz installation script:

```bash
# Clone the official SigNoz repository
git clone https://github.com/SigNoz/signoz.git
cd signoz/deploy/docker/clickhouse-setup

# Modify the docker-compose.yaml to:
# 1. Change ports to start from 1005
# 2. Remove/comment out Prometheus service
# 3. Set PROMETHEUS_QUERY_ENDPOINT to your existing Prometheus

# Start SigNoz
docker-compose up -d
```

## Option 2: Build from Source

If you need a custom setup, you can build the images from source:

```bash
git clone https://github.com/SigNoz/signoz.git
cd signoz

# Build the images
docker-compose -f deploy/docker/clickhouse-setup/docker-compose.yaml build

# Then use the built images in your custom docker-compose file
```

## Option 3: Use Minimal Setup (OpenTelemetry Collector + ClickHouse Only)

If you only need to collect telemetry data and can access it via ClickHouse directly, you can use just the OpenTelemetry Collector and ClickHouse (which we already have configured).

The current `docker-compose.signoz.yml` file has:
- ✅ ClickHouse (working)
- ✅ OpenTelemetry Collector (using standard otel image - working)
- ❌ Query Service (needs to be built from source)
- ❌ Frontend (needs to be built from source)

## Recommended Next Steps

1. **Use the official SigNoz installation** from their GitHub repository
2. **Modify their docker-compose.yaml** to:
   - Change ports to start from 1005
   - Point to your existing Prometheus
   - Remove their Prometheus service

3. **Or** use the current minimal setup (ClickHouse + OTel Collector) and access data via ClickHouse directly or build the query-service and frontend from source.

For more information, visit: https://signoz.io/docs/install/docker/






