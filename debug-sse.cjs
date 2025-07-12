// Debug SSE script
const EventSource = require('eventsource');
const fetch = require('node-fetch');

console.log('🔍 Starting SSE debug test...');

const sseUrl = 'http://localhost:8021/api/candidates/sse';
console.log('📡 Connecting to:', sseUrl);

const eventSource = new EventSource(sseUrl);

eventSource.onopen = () => {
  console.log('✅ SSE connection opened successfully');
};

eventSource.onerror = (error) => {
  console.error('❌ SSE connection error:', error);
};

eventSource.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    console.log('📨 Received message:', data);
  } catch (e) {
    console.log('📨 Raw message:', event.data);
  }
};

// Listen for recruitment stages updates
eventSource.addEventListener('recruitment-stages', (event) => {
  try {
    console.log('🎯 Received recruitment-stages event!');
    const stages = JSON.parse(event.data);
    console.log('📋 Stages:', stages.map(s => s.name));
  } catch (e) {
    console.error('❌ Error parsing recruitment stages:', e.message);
  }
});

// Test manual SSE broadcast after 3 seconds
setTimeout(async () => {
  console.log('🧪 Testing manual SSE broadcast...');
  try {
    const response = await fetch('http://localhost:8021/api/test/sse-recruitment-stages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Manual SSE test successful:', result);
    } else {
      const errorText = await response.text();
      console.error('❌ Manual SSE test failed:', response.status, errorText);
    }
  } catch (error) {
    console.error('❌ Error testing manual SSE:', error.message);
  }
}, 3000);

// Close after 10 seconds
setTimeout(() => {
  console.log('🛑 Closing SSE connection...');
  eventSource.close();
  process.exit(0);
}, 10000); 