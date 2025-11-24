# SigNoz Docker Compose Setup

This Docker Compose file sets up SigNoz observability platform with ports starting from 1005.

**Note:** This setup uses your existing Prometheus instance. You must configure the Prometheus endpoint before starting.

## Configuration Required

### Set Your Prometheus Endpoint

You **must** set the `PROMETHEUS_QUERY_ENDPOINT` environment variable to point to your existing Prometheus:

**Option 1: Using .env.signoz file (Recommended)**
1. Copy the template file:
   ```bash
   cp env.signoz.template .env.signoz
   ```

2. Edit `.env.signoz` and set your Prometheus endpoint:
   ```env
   PROMETHEUS_QUERY_ENDPOINT=http://your-existing-prometheus-host:9090
   CLICKHOUSE_PASSWORD=signoz
   ```

3. Start SigNoz:
   ```bash
   docker-compose -f docker-compose.signoz.yml up -d
   ```

**Option 2: Export environment variable**
```bash
export PROMETHEUS_QUERY_ENDPOINT=http://your-existing-prometheus-host:9090
docker-compose -f docker-compose.signoz.yml up -d
```

### Prometheus Endpoint Examples

Depending on where your Prometheus is running:

- **Prometheus on host machine:**
  ```env
  PROMETHEUS_QUERY_ENDPOINT=http://host.docker.internal:9090
  ```

- **Prometheus in Docker (same network):**
  ```env
  PROMETHEUS_QUERY_ENDPOINT=http://your-prometheus-container-name:9090
  ```

- **Prometheus on different network/IP:**
  ```env
  PROMETHEUS_QUERY_ENDPOINT=http://192.168.1.100:9090
  ```

### Configure Your Prometheus to Scrape SigNoz

Add this scrape config to your existing Prometheus configuration to collect metrics from SigNoz's OpenTelemetry Collector:

```yaml
scrape_configs:
  # ... your existing scrape configs ...
  
  - job_name: 'signoz-otel-collector'
    static_configs:
      - targets: ['localhost:10059']  # SigNoz OTel Collector metrics endpoint
        # Or use the host IP if Prometheus is not on the same machine:
        # - targets: ['192.168.1.100:10059']
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

## Quick Start

1. **Set your Prometheus endpoint:**
   ```bash
   export PROMETHEUS_QUERY_ENDPOINT=http://your-prometheus:9090
   ```

2. **Start SigNoz:**
   ```bash
   docker-compose -f docker-compose.signoz.yml up -d
   ```

3. **Access SigNoz UI:**
   - Open http://localhost:10055 in your browser

## Environment Variables

- `CLICKHOUSE_PASSWORD`: ClickHouse password (default: `signoz`)
- `PROMETHEUS_QUERY_ENDPOINT`: **REQUIRED** - URL to your existing Prometheus instance

## Network Configuration

If your existing Prometheus is on a different Docker network, you have a few options:

1. **Connect SigNoz to the same network:**
   ```yaml
   # In your docker-compose.signoz.yml, add to each service:
   networks:
     - signoz-network
     - your-prometheus-network  # Add your Prometheus network
   ```

2. **Use host.docker.internal (if Prometheus is on host):**
   ```env
   PROMETHEUS_QUERY_ENDPOINT=http://host.docker.internal:9090
   ```

3. **Use the host IP address:**
   ```env
   PROMETHEUS_QUERY_ENDPOINT=http://172.25.30.10:9090
   ```

## Verifying Connection

After starting, check the query-service logs to verify Prometheus connection:
```bash
docker logs signoz-query-service
```

You should see successful connection messages to your Prometheus endpoint.

