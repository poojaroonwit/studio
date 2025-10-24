import { NextRequest } from 'next/server';
import { getApiServers } from '@/lib/apiServers';

export async function GET(req: NextRequest) {
  return new Response(JSON.stringify(getApiServers()), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
} 
