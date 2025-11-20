export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const client = await getPool().connect();
  
  try {
    // Fetch the upload queue item
    const res = await client.query('SELECT * FROM upload_queue WHERE id = $1', [id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const item = res.rows[0];
    const filePath = item.file_path;

    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Read the file
    const fileBuffer = await readFile(filePath);
    const fileName = path.basename(filePath);
    const fileExtension = path.extname(fileName).toLowerCase();

    // Determine content type based on file extension
    let contentType = 'application/octet-stream';
    if (['.pdf'].includes(fileExtension)) {
      contentType = 'application/pdf';
    } else if (['.jpg', '.jpeg'].includes(fileExtension)) {
      contentType = 'image/jpeg';
    } else if (['.png'].includes(fileExtension)) {
      contentType = 'image/png';
    } else if (['.gif'].includes(fileExtension)) {
      contentType = 'image/gif';
    } else if (['.doc', '.docx'].includes(fileExtension)) {
      contentType = 'application/msword';
    } else if (['.txt'].includes(fileExtension)) {
      contentType = 'text/plain';
    }

    // Return the file with appropriate headers
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
