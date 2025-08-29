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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const attachments = await prisma.attachment.findMany({
      where: { headcountId: params.id },
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
  { params }: { params: { id: string } }
) {
  try {
    console.log('[HEADCOUNT ATTACHMENT] Starting upload for headcount:', params.id);
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      // Removed unauthorized logging to reduce container logs
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Removed user authentication logging to reduce container logs

    // Verify headcount exists
    const headcount = await prisma.headcount.findUnique({
      where: { id: params.id },
    });

    if (!headcount) {
      console.log('[HEADCOUNT ATTACHMENT] Headcount not found:', params.id);
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

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      console.log('[HEADCOUNT ATTACHMENT] File too large:', file.size, '>', maxSize);
      return NextResponse.json(
        { error: 'File size must be less than 50MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const extension = file.name.split('.').pop() || 'bin';
    const objectName = `headcount-attachments/${params.id}/${uuidv4()}.${extension}`;

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
          'x-amz-meta-headcount-id': params.id,
        }
      );
      
      console.log('[HEADCOUNT ATTACHMENT] File uploaded to MinIO successfully');
    } catch (minioError) {
      console.error('[HEADCOUNT ATTACHMENT] MinIO upload failed:', minioError);
      return NextResponse.json({ error: 'Failed to upload file to storage' }, { status: 500 });
    }

    // Create attachment record in database
    try {
      const attachment = await prisma.attachment.create({
        data: {
          headcountId: params.id,
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
      
      // Try to clean up the MinIO file if database creation fails
      try {
        await minioClient.removeObject(MINIO_BUCKET, objectName);
        console.log('[HEADCOUNT ATTACHMENT] Cleaned up MinIO file after DB failure');
      } catch (cleanupError) {
        console.error('[HEADCOUNT ATTACHMENT] Failed to cleanup MinIO file:', cleanupError);
      }
      
      return NextResponse.json({ error: 'Failed to save attachment record' }, { status: 500 });
    }
  } catch (error) {
    console.error('[HEADCOUNT ATTACHMENT] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete an attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');

    if (!attachmentId) {
      return NextResponse.json({ error: 'Attachment ID is required' }, { status: 400 });
    }

    // Find the attachment
    const attachment = await prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        headcountId: params.id,
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
