import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Simple link preview - in a real app you'd fetch the URL and extract metadata
    const urlObj = new URL(url);
    
    return NextResponse.json({
      success: 1,
      meta: {
        title: urlObj.hostname,
        description: `Link to ${urlObj.hostname}`,
        image: {
          url: ''
        }
      }
    });

  } catch (error) {
    console.error('Link preview error:', error);
    return NextResponse.json(
      { error: 'Failed to get link preview' },
      { status: 500 }
    );
  }
} 