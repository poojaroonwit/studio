import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { minioClient } from '@/lib/minio';
import { MINIO_BUCKET, MINIO_PUBLIC_BASE_URL } from '@/lib/minio-constants';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const ENDPOINT = '/api/v1/candidates/[id]/attachments';

// GET: List attachments for a candidate
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  try {
    const attachments = await prisma.attachment.findMany({
      where: { candidateId: id },
      orderBy: { uploadedAt: 'desc' },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });
    const attachmentsWithUrl = attachments.map((a: typeof attachments[0]) => ({
      ...a,
      url: `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${a.filePath}`
    }));
    return NextResponse.json({ data: attachmentsWithUrl });
  } catch (err) {
    return NextResponse.json({ error: 'Error fetching attachments', code: 'INTERNAL_ERROR', endpoint: ENDPOINT, details: String(err) }, { status: 500 });
  }
}

// POST: Upload an attachment (multipart/form-data)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', endpoint: ENDPOINT, details: { message: 'No valid session' } }, { status: 401 });
  }
  const formData = await req.formData();
  const file = formData.get('attachment');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Invalid input', code: 'BAD_REQUEST', endpoint: ENDPOINT, details: { attachment: ['No file uploaded'] } }, { status: 400 });
  }
  const ext = (file.name || 'pdf').split('.').pop();
  const objectName = `attachments/${id}/${uuidv4()}.${ext}`;
  try {
    const arrayBuffer = await file.arrayBuffer();
    await minioClient.putObject(
      MINIO_BUCKET,
      objectName,
      Buffer.from(arrayBuffer),
      undefined,
      { 'Content-Type': file.type || 'application/pdf' }
    );
    const count = await prisma.attachment.count({ where: { candidateId: id } });
    const isPrimary = count === 0;
    const newAttachment = await prisma.attachment.create({
      data: {
        candidateId: id,
        uploadedById: session.user.id,
        filePath: objectName,
        fileName: file.name,
        isPrimary,
        label: 'resume',
      },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ data: { ...newAttachment, url: `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${objectName}` } }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Error uploading attachment', code: 'INTERNAL_ERROR', endpoint: ENDPOINT, details: String(err) }, { status: 500 });
  }
}

// PUT: Set an attachment as primary
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', endpoint: ENDPOINT, details: { message: 'No valid session' } }, { status: 401 });
  }
  let attachmentId;
  try {
    const body = await req.json();
    attachmentId = body.attachmentId;
    if (!attachmentId) {
      return NextResponse.json({ error: 'Invalid input', code: 'BAD_REQUEST', endpoint: ENDPOINT, details: { attachmentId: ['Missing attachmentId'] } }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid input', code: 'BAD_REQUEST', endpoint: ENDPOINT, details: { message: 'Invalid JSON body' } }, { status: 400 });
  }
  try {
    await prisma.attachment.updateMany({ where: { candidateId: id }, data: { isPrimary: false } });
    const updated = await prisma.attachment.update({ where: { id: attachmentId, candidateId: id }, data: { isPrimary: true } });
    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json({ error: 'Error setting primary attachment', code: 'INTERNAL_ERROR', endpoint: ENDPOINT, details: String(err) }, { status: 500 });
  }
}

// DELETE: Remove an attachment
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', endpoint: ENDPOINT, details: { message: 'No valid session' } }, { status: 401 });
  }
  let attachmentId;
  try {
    const body = await req.json();
    attachmentId = body.attachmentId;
    if (!attachmentId) {
      return NextResponse.json({ error: 'Invalid input', code: 'BAD_REQUEST', endpoint: ENDPOINT, details: { attachmentId: ['Missing attachmentId'] } }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid input', code: 'BAD_REQUEST', endpoint: ENDPOINT, details: { message: 'Invalid JSON body' } }, { status: 400 });
  }
  try {
    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId, candidateId: id } });
    if (!attachment) return NextResponse.json({ error: 'Attachment not found', code: 'NOT_FOUND', endpoint: ENDPOINT, details: { attachmentId: ['Attachment not found'] } }, { status: 404 });
    await minioClient.removeObject(MINIO_BUCKET, attachment.filePath);
    await prisma.attachment.delete({ where: { id: attachmentId, candidateId: id } });
    const remaining = await prisma.attachment.findMany({ where: { candidateId: id }, orderBy: { uploadedAt: 'desc' } });
    if (attachment.isPrimary && remaining.length > 0) {
      await prisma.attachment.update({ where: { id: remaining[0].id }, data: { isPrimary: true } });
    }
    return NextResponse.json({ message: 'Deleted' });
  } catch (err) {
    return NextResponse.json({ error: 'Error deleting attachment', code: 'INTERNAL_ERROR', endpoint: ENDPOINT, details: String(err) }, { status: 500 });
  }
} 