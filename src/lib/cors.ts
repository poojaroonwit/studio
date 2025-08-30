import { NextRequest } from "next/server";

export function handleCors(req: NextRequest) {
  const origin = req.headers.get('origin') || 'http://localhost:3000';
  const allowedOrigins = [
    'http://localhost:3000',
    'http://192.168.1.37:3000',
    'http://192.168.1.37:8021',
    'http://localhost:8021'
  ];
  
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
  };
} 