import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET: List comments for a candidate
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  try {
    const comments = await prisma.candidateComment.findMany({
      where: { candidateId: id },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ data: comments });
  } catch (err) {
    return NextResponse.json({ message: 'Error fetching comments', error: String(err) }, { status: 500 });
  }
}

// POST: Add a comment
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  try {
    const newComment = await prisma.candidateComment.create({
      data: {
        candidateId: id,
        authorId: session.user.id,
        content: body.content,
      },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ data: newComment }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ message: 'Error creating comment', error: String(err) }, { status: 500 });
  }
}

// PUT: Edit a comment (only author can edit)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { commentId, content } = await req.json();
  try {
    const comment = await prisma.candidateComment.findUnique({ where: { id: commentId, candidateId: id } });
    if (!comment) return NextResponse.json({ message: 'Comment not found' }, { status: 404 });
    if (comment.authorId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden: Only the author can edit this comment.' }, { status: 403 });
    }
    const updated = await prisma.candidateComment.update({
      where: { id: commentId, candidateId: id },
      data: { content },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json({ message: 'Error updating comment', error: String(err) }, { status: 500 });
  }
}

// DELETE: Remove a comment (only author can delete)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { commentId } = await req.json();
  try {
    const comment = await prisma.candidateComment.findUnique({ where: { id: commentId, candidateId: id } });
    if (!comment) return NextResponse.json({ message: 'Comment not found' }, { status: 404 });
    if (comment.authorId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden: Only the author can delete this comment.' }, { status: 403 });
    }
    await prisma.candidateComment.delete({ where: { id: commentId, candidateId: id } });
    return NextResponse.json({ message: 'Deleted' });
  } catch (err) {
    return NextResponse.json({ message: 'Error deleting comment', error: String(err) }, { status: 500 });
  }
} 