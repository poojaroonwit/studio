import { NextRequest } from 'next/server';

// You can customize this list or load from env/config if needed
const servers = [
  { url: 'http://10.0.10.71:8021', description: 'Production server' },
  { url: 'http://localhost:8021', description: 'Local development server' },
  // Add more servers as needed
];

export async function GET(req: NextRequest) {
  return new Response(JSON.stringify(servers), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
} 