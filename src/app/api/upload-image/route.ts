import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { minioClient, ensureBucketExists, MINIO_BUCKET, MINIO_PUBLIC_BASE_URL } from '@/lib/minio';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    // Handle both 'file' and 'image' field names for backward compatibility
    const file = (formData.get('file') || formData.get('image')) as File;
    const type = formData.get('type') as string;
    
    if (!file) {
      console.error('[UPLOAD-IMAGE] No file found in request');
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('[UPLOAD-IMAGE] Invalid file type:', file.type);
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (max 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      console.error('[UPLOAD-IMAGE] File too large:', file.size);
      return NextResponse.json(
        { error: 'File size must be less than 500MB' },
        { status: 400 }
      );
    }

    // Ensure MinIO bucket exists and has public read access
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
      // console.log('[UPLOAD-IMAGE] Bucket policy set for public read access');
    } catch (minioError) {
      console.error('[UPLOAD-IMAGE] MinIO bucket error:', minioError);
      return NextResponse.json(
        { error: 'Storage service unavailable' },
        { status: 503 }
      );
    }

    // Generate unique filename with timestamp for cache busting
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    let objectName: string;
    
    if (type === 'candidate-source-logo') {
      objectName = `candidate-source-logo/${timestamp}-${randomUUID()}.${extension}`;
    } else {
      objectName = `profile-images/${timestamp}-${randomUUID()}.${extension}`;
    }
    
    // console.log('[UPLOAD-IMAGE] Uploading to MinIO:', objectName);

    // Convert file to buffer and upload to MinIO
    const buffer = Buffer.from(await file.arrayBuffer());
    await minioClient.putObject(MINIO_BUCKET, objectName, buffer, buffer.length, {
      'Content-Type': file.type,
      'x-amz-meta-originalname': file.name,
      'x-amz-meta-uploaded-by': session.user.id,
      'x-amz-meta-upload-date': new Date().toISOString(),
      // Add cache control headers to prevent caching
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    // Return the public URL with cache-busting parameter
    const publicUrl = `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${objectName}`;
    // console.log('[UPLOAD-IMAGE] File uploaded successfully:', publicUrl);

    // Create response with cache-busting headers
    const response = NextResponse.json({
      success: true,
      file: {
        url: publicUrl,
        filename: file.name,
        size: file.size,
        type: file.type
      },
      url: publicUrl, // For backward compatibility
      filename: file.name,
      size: file.size,
      type: file.type
    });

    // Add cache-busting headers to prevent browser caching
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;

  } catch (error) {
    console.error('[UPLOAD-IMAGE] Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
} 