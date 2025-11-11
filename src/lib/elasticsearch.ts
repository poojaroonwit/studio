// src/lib/elasticsearch.ts
import { Client } from '@elastic/elasticsearch';

let elasticsearchClient: Client | null = null;

/**
 * Get or create Elasticsearch client instance
 */
export function getElasticsearchClient(): Client | null {
  // Return null if Elasticsearch is not configured
  if (!process.env.ELASTICSEARCH_URL) {
    return null;
  }

  if (!elasticsearchClient) {
    const node = process.env.ELASTICSEARCH_URL;
    const auth = process.env.ELASTICSEARCH_AUTH
      ? {
          username: process.env.ELASTICSEARCH_USERNAME || '',
          password: process.env.ELASTICSEARCH_PASSWORD || '',
        }
      : undefined;

    elasticsearchClient = new Client({
      node,
      auth,
      ssl: {
        rejectUnauthorized: process.env.ELASTICSEARCH_SSL_VERIFY !== 'false',
      },
      requestTimeout: parseInt(process.env.ELASTICSEARCH_TIMEOUT || '30000', 10),
    });
  }

  return elasticsearchClient;
}

/**
 * Index a log entry to Elasticsearch
 */
export async function indexLogToElasticsearch(
  logEntry: {
    id: string;
    timestamp: Date | string;
    level: string;
    message: string;
    source?: string | null;
    actingUserId?: string | null;
    details?: Record<string, any> | null;
  }
): Promise<void> {
  // Check if Elasticsearch is configured via environment variable
  if (!process.env.ELASTICSEARCH_URL) {
    return; // Elasticsearch not configured, silently skip
  }

  const client = getElasticsearchClient();
  if (!client) {
    return; // Elasticsearch client creation failed, silently skip
  }

  try {
    const indexName = process.env.ELASTICSEARCH_INDEX || 'logs';
    const timestamp = typeof logEntry.timestamp === 'string' 
      ? new Date(logEntry.timestamp) 
      : logEntry.timestamp;

    await client.index({
      index: indexName,
      document: {
        id: logEntry.id,
        timestamp: timestamp.toISOString(),
        level: logEntry.level,
        message: logEntry.message,
        source: logEntry.source || null,
        actingUserId: logEntry.actingUserId || null,
        details: logEntry.details || null,
        '@timestamp': timestamp.toISOString(), // Elasticsearch convention
      },
    });
  } catch (error) {
    // Log error but don't throw - we don't want Elasticsearch failures to break logging
    console.error('Failed to index log to Elasticsearch:', error);
  }
}

/**
 * Search logs in Elasticsearch
 */
export async function searchLogsInElasticsearch(
  query: {
    search?: string;
    level?: string;
    source?: string;
    actingUserId?: string;
    startDate?: Date | string;
    endDate?: Date | string;
    page?: number;
    limit?: number;
  }
): Promise<{
  hits: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  // Check if Elasticsearch is configured via environment variable
  if (!process.env.ELASTICSEARCH_URL) {
    throw new Error('Elasticsearch is not configured. Please set ELASTICSEARCH_URL environment variable.');
  }

  const client = getElasticsearchClient();
  if (!client) {
    throw new Error('Failed to create Elasticsearch client. Please check your configuration.');
  }

  const indexName = process.env.ELASTICSEARCH_INDEX || 'logs';
  const page = query.page || 1;
  const limit = query.limit || 10;
  const from = (page - 1) * limit;

  const mustClauses: any[] = [];
  const shouldClauses: any[] = [];

  // Text search
  if (query.search && query.search.trim()) {
    shouldClauses.push({
      multi_match: {
        query: query.search.trim(),
        fields: ['message^2', 'source', 'details'],
        type: 'best_fields',
        fuzziness: 'AUTO',
      },
    });
  }

  // Level filter
  if (query.level) {
    mustClauses.push({
      term: { level: query.level },
    });
  }

  // Source filter
  if (query.source) {
    mustClauses.push({
      wildcard: { source: `*${query.source}*` },
    });
  }

  // Acting user filter
  if (query.actingUserId) {
    mustClauses.push({
      term: { actingUserId: query.actingUserId },
    });
  }

  // Date range filter
  if (query.startDate || query.endDate) {
    const range: any = {};
    if (query.startDate) {
      range.gte = typeof query.startDate === 'string' 
        ? query.startDate 
        : query.startDate.toISOString();
    }
    if (query.endDate) {
      range.lte = typeof query.endDate === 'string' 
        ? query.endDate 
        : query.endDate.toISOString();
    }
    mustClauses.push({
      range: {
        '@timestamp': range,
      },
    });
  }

  const body: any = {
    query: {
      bool: {
        must: mustClauses,
      },
      sort: [
        { '@timestamp': { order: 'desc' } },
      ],
    },
  };

  if (shouldClauses.length > 0) {
    body.query.bool.should = shouldClauses;
    body.query.bool.minimum_should_match = 1;
  }

  try {
    const response = await client.search({
      index: indexName,
      body,
      from,
      size: limit,
    });

    const hits = (response.hits.hits || []).map((hit: any) => ({
      ...hit._source,
      _id: hit._id,
      _score: hit._score,
    }));

    const total = typeof response.hits.total === 'object' 
      ? response.hits.total.value 
      : response.hits.total || 0;

    return {
      hits,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error('Failed to search logs in Elasticsearch:', error);
    throw error;
  }
}

/**
 * Initialize Elasticsearch index with proper mapping
 */
export async function initializeElasticsearchIndex(): Promise<void> {
  // Check if Elasticsearch is configured via environment variable
  if (!process.env.ELASTICSEARCH_URL) {
    return; // Elasticsearch not configured, silently skip
  }

  const client = getElasticsearchClient();
  if (!client) {
    return; // Elasticsearch client creation failed, silently skip
  }

  const indexName = process.env.ELASTICSEARCH_INDEX || 'logs';

  try {
    // Check if index exists
    const exists = await client.indices.exists({ index: indexName });
    
    if (!exists) {
      // Create index with mapping
      await client.indices.create({
        index: indexName,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              timestamp: { type: 'date' },
              '@timestamp': { type: 'date' },
              level: { type: 'keyword' },
              message: { 
                type: 'text',
                fields: {
                  keyword: { type: 'keyword' },
                },
              },
              source: { 
                type: 'text',
                fields: {
                  keyword: { type: 'keyword' },
                },
              },
              actingUserId: { type: 'keyword' },
              details: { type: 'object', enabled: true },
            },
          },
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
          },
        },
      });
    }
  } catch (error) {
    console.error('Failed to initialize Elasticsearch index:', error);
    // Don't throw - allow application to continue even if index creation fails
  }
}

