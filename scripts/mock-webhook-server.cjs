#!/usr/bin/env node

/**
 * Mock Webhook Server
 * 
 * This script creates a simple webhook server for testing the upload queue processing.
 * It simulates a webhook endpoint that processes CV files.
 */

const http = require('http');
const url = require('url');

const PORT = 8921;

// Mock webhook endpoint
function handleWebhook(req, res) {
  const parsedUrl = url.parse(req.url, true);
  
  console.log(`[Mock Webhook] ${req.method} ${req.url}`);
  console.log(`[Mock Webhook] Headers:`, req.headers);
  
  if (req.method === 'POST' && parsedUrl.pathname === '/webhook/exe-process') {
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        console.log(`[Mock Webhook] Received payload:`, JSON.stringify(payload, null, 2));
        
        // Simulate processing time
        setTimeout(() => {
          // Simulate success (you can change this to simulate errors)
          const response = {
            success: true,
            message: 'CV processed successfully',
            candidate_id: Math.floor(Math.random() * 10000),
            processing_time: Math.random() * 2 + 1,
            timestamp: new Date().toISOString()
          };
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
          
          console.log(`[Mock Webhook] Responded with success`);
        }, 1000 + Math.random() * 2000); // 1-3 seconds processing time
        
      } catch (error) {
        console.error(`[Mock Webhook] Error parsing payload:`, error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
  } else if (req.method === 'GET' && parsedUrl.pathname === '/webhook/exe-process') {
    // Health check endpoint
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      message: 'Mock webhook server is running',
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  }
}

// Create server
const server = http.createServer(handleWebhook);

server.listen(PORT, () => {
  console.log(`🚀 Mock webhook server running on http://localhost:${PORT}`);
  console.log(`📝 Webhook endpoint: http://localhost:${PORT}/webhook/exe-process`);
  console.log(`🔍 Health check: http://localhost:${PORT}/webhook/exe-process (GET)`);
  console.log(`⏹️  Press Ctrl+C to stop`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down mock webhook server...');
  server.close(() => {
    console.log('✅ Mock webhook server stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down mock webhook server...');
  server.close(() => {
    console.log('✅ Mock webhook server stopped');
    process.exit(0);
  });
}); 