// Test script for Server-Sent Events endpoint
const EventSource = require('eventsource');

console.log('🧪 Testing SSE endpoint...');

const sseUrl = 'http://localhost:8021/api/upload-queue/sse';
const eventSource = new EventSource(sseUrl);

eventSource.onopen = () => {
  console.log('✅ SSE connection opened');
};

eventSource.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    console.log('📨 Received SSE message:', {
      type: data.type,
      itemCount: data.data?.length || 0,
      total: data.total || 0
    });
  } catch (error) {
    console.log('📨 Raw SSE message:', event.data);
  }
};

eventSource.onerror = (error) => {
  console.error('❌ SSE connection error:', error);
};

// Close after 10 seconds
setTimeout(() => {
  console.log('🛑 Closing SSE connection...');
  eventSource.close();
  process.exit(0);
}, 10000); 