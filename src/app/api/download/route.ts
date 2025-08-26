import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const fileUrl = url.searchParams.get('url');
  const fileName = url.searchParams.get('fileName');

  if (!fileUrl) {
    return NextResponse.json({ error: 'File URL is required' }, { status: 400 });
  }

  let timeoutId: NodeJS.Timeout | null = null;

  try {
    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(fileUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Fetch the file from the URL with timeout
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(fileUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Studio-Download-API/1.0'
      }
    });
    
    // Clear timeout on successful response
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: `Failed to fetch file: ${response.status} ${response.statusText}` 
      }, { status: response.status });
    }

    // Get the file content as a buffer
    const buffer = await response.arrayBuffer();
    
    if (buffer.byteLength === 0) {
      return NextResponse.json({ 
        error: 'Downloaded file is empty' 
      }, { status: 400 });
    }
    
    // Determine the filename
    let finalFileName = fileName || 'downloaded-file';
    
    // If no filename provided, try to extract from URL or content-disposition header
    if (!fileName) {
      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          finalFileName = filenameMatch[1].replace(/['"]/g, '');
        }
      } else {
        // Extract from URL path
        const urlPath = parsedUrl.pathname;
        const pathParts = urlPath.split('/');
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && lastPart.includes('.')) {
          finalFileName = lastPart;
        }
      }
    }

    // Sanitize filename for security
    finalFileName = finalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Get content type from response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Create response with proper headers for download
    const downloadResponse = new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${finalFileName}"`,
        'Content-Length': buffer.byteLength.toString(),
        'Cache-Control': 'no-cache',
        'X-Download-Source': 'Studio-Download-API'
      },
    });

    return downloadResponse;
  } catch (error) {
    // Clear timeout on error
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    
    console.error('Download error:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ 
        error: 'Download timeout - file is too large or server is slow' 
      }, { status: 408 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to download file' 
    }, { status: 500 });
  }
} 