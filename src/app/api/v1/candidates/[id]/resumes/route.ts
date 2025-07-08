import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { minioClient } from '@/lib/minio';
import { MINIO_BUCKET, MINIO_PUBLIC_BASE_URL } from '@/lib/minio-constants';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET: List attachments for a candidate
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  try {
    const attachments = await prisma.attachment.findMany({
      where: { candidateId: id },
      orderBy: { uploadedAt: 'desc' },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });
    // Add public URL
    const attachmentsWithUrl = attachments.map((a: typeof attachments[0]) => ({
      ...a,
      url: `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${a.filePath}`
    }));
    return NextResponse.json({ data: attachmentsWithUrl });
  } catch (err) {
    return NextResponse.json({ message: 'Error fetching attachments', error: String(err) }, { status: 500 });
  }
}

// POST: Upload an attachment (multipart/form-data)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  // Parse multipart form
  const formData = await req.formData();
  const file = formData.get('attachment');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
  }
  const ext = (file.name || 'pdf').split('.').pop();
  const objectName = `attachments/${id}/${uuidv4()}.${ext}`;
  try {
    // Upload to MinIO
    const arrayBuffer = await file.arrayBuffer();
    await minioClient.putObject(
      MINIO_BUCKET,
      objectName,
      Buffer.from(arrayBuffer),
      undefined,
      { 'Content-Type': file.type || 'application/pdf' }
    );
    // Set isPrimary true if this is the first attachment
    const count = await prisma.attachment.count({ where: { candidateId: id } });
    const isPrimary = count === 0;
    // Store in DB
    const newAttachment = await prisma.attachment.create({
      data: {
        candidateId: id,
        uploadedById: session.user.id,
        filePath: objectName,
        fileName: file.name,
        isPrimary,
        label: 'resume', // Added label field as required
      },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ data: { ...newAttachment, url: `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${objectName}` } }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ message: 'Error uploading attachment', error: String(err) }, { status: 500 });
  }
}

// PUT: Set an attachment as primary
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { attachmentId } = await req.json();
  try {
    // Unset all
    await prisma.attachment.updateMany({ where: { candidateId: id }, data: { isPrimary: false } });
    // Set one
    const updated = await prisma.attachment.update({ where: { id: attachmentId, candidateId: id }, data: { isPrimary: true } });
    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json({ message: 'Error setting primary attachment', error: String(err) }, { status: 500 });
  }
}

// DELETE: Remove an attachment
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { attachmentId } = await req.json();
  try {
    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId, candidateId: id } });
    if (!attachment) return NextResponse.json({ message: 'Attachment not found' }, { status: 404 });
    // Delete from MinIO
    await minioClient.removeObject(MINIO_BUCKET, attachment.filePath);
    // Delete from DB
    await prisma.attachment.delete({ where: { id: attachmentId, candidateId: id } });
    // If primary was deleted, set first as primary
    const remaining = await prisma.attachment.findMany({ where: { candidateId: id }, orderBy: { uploadedAt: 'desc' } });
    if (attachment.isPrimary && remaining.length > 0) {
      await prisma.attachment.update({ where: { id: remaining[0].id }, data: { isPrimary: true } });
    }
    return NextResponse.json({ message: 'Deleted' });
  } catch (err) {
    return NextResponse.json({ message: 'Error deleting attachment', error: String(err) }, { status: 500 });
  }
} 