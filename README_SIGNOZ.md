# SigNoz Docker Compose Setup

This setup provides a complete SigNoz installation with ports starting from 1005.

## Quick Start

### Step 1: Build SigNoz Images

The SigNoz query-service and frontend images need to be built from source. You have two options:

**Option A: Use the setup script (Recommended)**
```bash
chmod +x setup-signoz.sh
./setup-signoz.sh
```

**Option B: Manual build**
```bash
# Clone SigNoz repository
git clone https://github.com/SigNoz/signoz.git

# Build the images
cd signoz/deploy/docker/clickhouse-setup
docker-compose build

# Tag the images for our compose file
docker tag signoz-query-service:latest signoz/query-service:latest
docker tag signoz-frontend:latest signoz/frontend:latest
```

### Step 2: Configure Environment

1. Copy the environment template:
   ```bash
   cp env.signoz.template .env.signoz
   ```

2. Edit `.env.signoz` and set your Prometheus endpoint:
   ```env
   PROMETHEUS_QUERY_ENDPOINT=http://host.docker.internal:9090
   CLICKHOUSE_PASSWORD=signoz
   ```

### Step 3: Start SigNoz

```bash
docker-compose -f docker-compose.signoz.yml up -d
```

## Ports

- **10050**: ClickHouse HTTP
- **10051**: ClickHouse Native
- **10052**: Zookeeper
- **10053**: Kafka
- **10054**: Query Service API
- **10055**: Frontend UI (main access point)
- **10056**: OTLP gRPC receiver
- **10057**: OTLP HTTP receiver
- **10058**: Prometheus metrics (internal)
- **10059**: Prometheus exporter metrics (for your Prometheus to scrape)

## Access SigNoz

- **Frontend UI**: http://localhost:10055
- **Query Service API**: http://localhost:10054

## Configure Your Prometheus

Add this to your Prometheus configuration to scrape SigNoz metrics:

```yaml
scrape_configs:
  - job_name: 'signoz-otel-collector'
    static_configs:
      - targets: ['localhost:10059']
```

## Troubleshooting

### Images not found
If you get "image not found" errors, make sure you've built the SigNoz images using the setup script or manual build process.

### Prometheus connection issues
Verify your `PROMETHEUS_QUERY_ENDPOINT` in `.env.signoz` is correct:
- For host machine: `http://host.docker.internal:9090`
- For Docker container: `http://container-name:9090`
- For IP address: `http://192.168.1.100:9090`

### Check container status
```bash
docker-compose -f docker-compose.signoz.yml ps
```

### View logs
```bash
docker-compose -f docker-compose.signoz.yml logs -f
```





