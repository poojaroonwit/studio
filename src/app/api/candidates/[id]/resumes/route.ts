import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { minioClient } from '@/lib/minio';
import { MINIO_BUCKET, MINIO_PUBLIC_BASE_URL } from '@/lib/minio-constants';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET: List resumes for a candidate
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  try {
    const resumes = await prisma.resume.findMany({
      where: { candidateId: id },
      orderBy: { uploadedAt: 'desc' },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });
    // Add public URL
    const resumesWithUrl = resumes.map((r: typeof resumes[0]) => ({
      ...r,
      url: `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${r.filePath}`
    }));
    return NextResponse.json({ data: resumesWithUrl });
  } catch (err) {
    return NextResponse.json({ message: 'Error fetching resumes', error: String(err) }, { status: 500 });
  }
}

// POST: Upload a resume (multipart/form-data)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  // Parse multipart form
  const formData = await req.formData();
  const file = formData.get('resume');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
  }
  const ext = (file.name || 'pdf').split('.').pop();
  const objectName = `resumes/${id}/${uuidv4()}.${ext}`;
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
    // Set isPrimary true if this is the first resume
    const count = await prisma.resume.count({ where: { candidateId: id } });
    const isPrimary = count === 0;
    // Store in DB
    const newResume = await prisma.resume.create({
      data: {
        candidateId: id,
        uploadedById: session.user.id,
        filePath: objectName,
        fileName: file.name,
        isPrimary,
      },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ data: { ...newResume, url: `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${objectName}` } }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ message: 'Error uploading resume', error: String(err) }, { status: 500 });
  }
}

// PUT: Set a resume as primary
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { resumeId } = await req.json();
  try {
    // Unset all
    await prisma.resume.updateMany({ where: { candidateId: id }, data: { isPrimary: false } });
    // Set one
    const updated = await prisma.resume.update({ where: { id: resumeId, candidateId: id }, data: { isPrimary: true } });
    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json({ message: 'Error setting primary resume', error: String(err) }, { status: 500 });
  }
}

// DELETE: Remove a resume
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { resumeId } = await req.json();
  try {
    const resume = await prisma.resume.findUnique({ where: { id: resumeId, candidateId: id } });
    if (!resume) return NextResponse.json({ message: 'Resume not found' }, { status: 404 });
    // Delete from MinIO
    await minioClient.removeObject(MINIO_BUCKET, resume.filePath);
    // Delete from DB
    await prisma.resume.delete({ where: { id: resumeId, candidateId: id } });
    // If primary was deleted, set first as primary
    const remaining = await prisma.resume.findMany({ where: { candidateId: id }, orderBy: { uploadedAt: 'desc' } });
    if (resume.isPrimary && remaining.length > 0) {
      await prisma.resume.update({ where: { id: remaining[0].id }, data: { isPrimary: true } });
    }
    return NextResponse.json({ message: 'Deleted' });
  } catch (err) {
    return NextResponse.json({ message: 'Error deleting resume', error: String(err) }, { status: 500 });
  }
} 