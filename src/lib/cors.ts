import { NextRequest } from "next/server";

export function handleCors(req: NextRequest) {
  return {
    "Access-Control-Allow-Origin": "http://localhost:3000", // Set to your frontend URL
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
  };
} 