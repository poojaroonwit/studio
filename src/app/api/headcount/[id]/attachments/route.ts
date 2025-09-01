import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { minioClient, MINIO_BUCKET, MINIO_PUBLIC_BASE_URL } from '@/lib/minio';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

// GET: Fetch attachments for a headcount
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const attachments = await prisma.attachment.findMany({
      where: { headcountId: id },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    return NextResponse.json(attachments);
  } catch (error) {
    console.error('Error fetching headcount attachments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Upload attachment for a headcount
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[HEADCOUNT ATTACHMENT] Starting upload for headcount:', id);
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      // Removed unauthorized logging to reduce container logs
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Removed user authentication logging to reduce container logs

    // Verify headcount exists
    const headcount = await prisma.headcount.findUnique({
      where: { id },
    });

    if (!headcount) {
      console.log('[HEADCOUNT ATTACHMENT] Headcount not found:', id);
      return NextResponse.json({ error: 'Headcount not found' }, { status: 404 });
    }

    console.log('[HEADCOUNT ATTACHMENT] Headcount found:', headcount.id);

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const label = formData.get('label') as string || 'attachment';

    if (!file) {
      console.log('[HEADCOUNT ATTACHMENT] No file uploaded');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    console.log('[HEADCOUNT ATTACHMENT] File received:', file.name, 'Size:', file.size, 'Type:', file.type);

    // Check file size (increased from 50MB to 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Check MinIO configuration
    console.log('[HEADCOUNT ATTACHMENT] MinIO config - Bucket:', MINIO_BUCKET, 'Base URL:', MINIO_PUBLIC_BASE_URL);
    console.log('[HEADCOUNT ATTACHMENT] MinIO client config:', {
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: process.env.MINIO_PORT || '9000',
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin'
    });

    // Ensure MinIO bucket exists before upload
    try {
      const bucketExists = await minioClient.bucketExists(MINIO_BUCKET);
      if (!bucketExists) {
        console.log('[HEADCOUNT ATTACHMENT] Creating MinIO bucket:', MINIO_BUCKET);
        await minioClient.makeBucket(MINIO_BUCKET);
      }
      console.log('[HEADCOUNT ATTACHMENT] MinIO bucket is ready:', MINIO_BUCKET);
    } catch (bucketError) {
      console.error('[HEADCOUNT ATTACHMENT] MinIO bucket check/creation failed:', bucketError);
      console.error('[HEADCOUNT ATTACHMENT] Bucket error details:', {
        message: bucketError instanceof Error ? bucketError.message : 'Unknown error',
        stack: bucketError instanceof Error ? bucketError.stack : undefined,
        bucket: MINIO_BUCKET
      });
      return NextResponse.json({ 
        error: 'Storage service is not available',
        details: bucketError instanceof Error ? bucketError.message : 'Unknown bucket error'
      }, { status: 503 });
    }

    // Generate unique filename
    const extension = file.name.split('.').pop() || 'bin';
    const objectName = `headcount-attachments/${id}/${uuidv4()}.${extension}`;

    console.log('[HEADCOUNT ATTACHMENT] Generated object name:', objectName);

    // Upload to MinIO
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      console.log('[HEADCOUNT ATTACHMENT] File buffer created, size:', buffer.length);
      
      await minioClient.putObject(
        MINIO_BUCKET,
        objectName,
        buffer,
        buffer.length,
        {
          'Content-Type': file.type || 'application/octet-stream',
          'x-amz-meta-originalname': file.name,
          'x-amz-meta-uploaded-by': session.user.id,
          'x-amz-meta-upload-date': new Date().toISOString(),
          'x-amz-meta-headcount-id': id,
        }
      );
      
      console.log('[HEADCOUNT ATTACHMENT] File uploaded to MinIO successfully');
    } catch (minioError) {
      console.error('[HEADCOUNT ATTACHMENT] MinIO upload failed:', minioError);
      console.error('[HEADCOUNT ATTACHMENT] MinIO error details:', {
        message: minioError instanceof Error ? minioError.message : 'Unknown error',
        stack: minioError instanceof Error ? minioError.stack : undefined,
        bucket: MINIO_BUCKET,
        objectName
      });
      return NextResponse.json({ 
        error: 'Failed to upload file to storage',
        details: minioError instanceof Error ? minioError.message : 'Unknown MinIO error'
      }, { status: 500 });
    }

    // Create attachment record in database
    try {
      const attachment = await prisma.attachment.create({
        data: {
          headcountId: id,
          uploadedById: session.user.id,
          filePath: objectName,
          fileName: file.name,
          label: label,
          isPrimary: false, // Headcount attachments are not primary by default
        },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      console.log('[HEADCOUNT ATTACHMENT] Database record created:', attachment.id);

      return NextResponse.json({
        ...attachment,
        url: `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${objectName}`,
      }, { status: 201 });
    } catch (dbError) {
      console.error('[HEADCOUNT ATTACHMENT] Database creation failed:', dbError);
      console.error('[HEADCOUNT ATTACHMENT] Database error details:', {
        message: dbError instanceof Error ? dbError.message : 'Unknown error',
        stack: dbError instanceof Error ? dbError.stack : undefined
      });
      
      // Try to clean up the MinIO file if database creation fails
      try {
        await minioClient.removeObject(MINIO_BUCKET, objectName);
        console.log('[HEADCOUNT ATTACHMENT] Cleaned up MinIO file after DB failure');
      } catch (cleanupError) {
        console.error('[HEADCOUNT ATTACHMENT] Failed to cleanup MinIO file:', cleanupError);
      }
      
      return NextResponse.json({ 
        error: 'Failed to save attachment record',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[HEADCOUNT ATTACHMENT] Unexpected error:', error);
    console.error('[HEADCOUNT ATTACHMENT] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE: Delete an attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');

    if (!attachmentId) {
      return NextResponse.json({ error: 'Attachment ID is required' }, { status: 400 });
    }

    // Find the attachment
    const attachment = await prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        headcountId: id,
      },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Delete from MinIO
    try {
      await minioClient.removeObject(MINIO_BUCKET, attachment.filePath);
    } catch (minioError) {
      console.error('Error deleting file from MinIO:', minioError);
      // Continue with database deletion even if MinIO deletion fails
    }

    // Delete from database
    await prisma.attachment.delete({
      where: { id: attachmentId },
    });

    return NextResponse.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Error deleting headcount attachment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
