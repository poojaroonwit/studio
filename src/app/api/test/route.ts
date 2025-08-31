import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Test API endpoint called');
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    
    return NextResponse.json({ 
      message: "Test API working",
      databaseUrl: process.env.DATABASE_URL ? "Set" : "Not set",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({ 
      message: "Test API error", 
      error: (error as Error).message 
    }, { status: 500 });
  }
}
