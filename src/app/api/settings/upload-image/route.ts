import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { logAudit } from '@/lib/auditLog';
import { getPool } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { minioClient, MINIO_BUCKET, ensureBucketExists } from '@/lib/minio';
import { Buffer } from 'buffer';

export async function PUT(request: NextRequest) {
  // Only allow Admin or SYSTEM_SETTINGS_MANAGE
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'Admin' && !session?.user?.modulePermissions?.includes('SYSTEM_SETTINGS_MANAGE')) {
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

  // Ensure MinIO bucket exists and has public read access (like avatar upload)
  try {
    await ensureBucketExists();
    // Set bucket policy for public read access
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${MINIO_BUCKET}/*`]
        }
      ]
    };
    await minioClient.setBucketPolicy(MINIO_BUCKET, JSON.stringify(policy));
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
  });
  // Use the same public URL logic as avatar upload (hardcode the port that works for avatars)
  const publicUrl = `http://localhost:8621/${MINIO_BUCKET}/${objectName}`;
  return NextResponse.json({ url: publicUrl });
} 