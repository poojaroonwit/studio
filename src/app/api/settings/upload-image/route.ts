import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { logAudit } from '@/lib/auditLog';
import { getPool } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { minioClient, MINIO_BUCKET, ensureBucketExists, MINIO_PUBLIC_BASE_URL } from '@/lib/minio';
import { Buffer } from 'buffer';

export const maxDuration = 300; // 5 minutes timeout
export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  try {
    // Only allow Admin or SYSTEM_SETTINGS_EDIT
    if (!session?.user || !hasPermission(session.user, 'SYSTEM_SETTINGS_EDIT')) {
      await logAudit('WARN', `Forbidden attempt to upload settings image by user ${session?.user?.email || 'Unknown'}.`, 'API:SystemSettings:UploadImage', session?.user?.id);
      return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (!(file as File).type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }
    
    // Validate file size (max 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if ((file as File).size > maxSize) {
      console.error('[SETTINGS UPLOAD] File too large:', (file as File).size);
      return NextResponse.json({ error: 'File size must be less than 500MB' }, { status: 400 });
    }

    // Ensure MinIO bucket exists with private access only
    try {
      await ensureBucketExists();
      
      // SECURITY: Never set public read access - all files must be accessed via signed URLs
      console.log('[SETTINGS UPLOAD] ✅ SECURITY: Files uploaded with private access only');
    } catch (minioError) {
      console.error('[SETTINGS UPLOAD] MinIO bucket error:', minioError);
      await logAudit('ERROR', `Settings image upload failed - MinIO bucket error: ${minioError}`, 'API:SystemSettings:UploadImage', session?.user?.id);
      return NextResponse.json({ message: 'Storage service unavailable' }, { status: 503 });
    }

    const ext = (file as File).name.split('.').pop();
    const objectName = `settings/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer = Buffer.from(await (file as File).arrayBuffer());
    await getPool(); // Ensure DB pool is initialized (if needed for MinIO)
    await minioClient.putObject(MINIO_BUCKET, objectName, buffer, buffer.length, {
      'Content-Type': (file as File).type,
      // Add CORS headers for COEP compliance
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    // 🔒 SECURITY: Return web application URL instead of direct MinIO URL
    // Use preview endpoint for images displayed in img tags
    const webAppUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:8021'}/api/secure-file/preview?filePath=${encodeURIComponent(objectName)}`;
    
    // Return response with proper headers
    return NextResponse.json(
      { url: webAppUrl },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    console.error('[SETTINGS UPLOAD] Unexpected error:', error);
    await logAudit('ERROR', `Settings image upload failed - Unexpected error: ${error}`, 'API:SystemSettings:UploadImage', session?.user?.id);
    return NextResponse.json(
      { message: 'Internal server error during upload' },
      { status: 500 }
    );
  }
} 
