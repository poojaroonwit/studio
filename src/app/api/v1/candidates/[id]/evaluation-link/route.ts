import { auth } from '@/auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'
import { canViewEvaluationLinks, canCreateEvaluationLink, canManageEvaluationLink } from '@/lib/permissions'

const createSchema = z.object({
  days: z.number().int().min(1).max(365).optional(),
  force: z.boolean().optional(),
  requireLogin: z.boolean().optional(),
})

function buildEvaluateUrl(candidateId: string, token: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:8021'
  return `${baseUrl}/candidates/${encodeURIComponent(candidateId)}/evaluate?token=${encodeURIComponent(token)}`
}

async function getActiveLink(candidateId: string) {
  const now = new Date()
  const model = (prisma as any).candidateEvaluationLink
  if (!model) {
    throw new Error('CandidateEvaluationLink model not available. Run prisma generate and database migrations.');
  }
  return model.findFirst({
    where: {
      candidateId,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check permission to view evaluation links
    const { canView, reason } = canViewEvaluationLinks(session.user)
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden', message: reason || 'Insufficient permissions' }, { status: 403 })
    }

    const candidateId = (await params).id

    // Ensure candidate exists
    const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } })
    if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

    const link = await getActiveLink(candidateId)
    if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({
      id: link.id,
      token: link.token,
      url: buildEvaluateUrl(candidateId, link.token),
      expiresAt: link.expiresAt,
      revokedAt: link.revokedAt,
      createdAt: link.createdAt,
      createdBy: link.createdBy,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const hint = typeof message === 'string' && message.toLowerCase().includes('relation')
      ? 'Database table missing. Run migrations.'
      : undefined
    return NextResponse.json({ error: 'Internal Server Error', message, hint }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const candidateId = (await params).id
    const body = await request.json().catch(() => ({}))
    const { days = 7, force = false, requireLogin = true } = createSchema.parse(body)

    // Ensure candidate exists
    const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } })
    if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

    // Check permission to create evaluation link
    const { canCreate, reason } = canCreateEvaluationLink(session.user, candidate.recruiterId, session.user.id)
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden', message: reason || 'Insufficient permissions' }, { status: 403 })
    }

    const existing = await getActiveLink(candidateId)
    if (existing && !force) {
      return NextResponse.json({
        id: existing.id,
        token: existing.token,
        url: buildEvaluateUrl(candidateId, existing.token),
        expiresAt: existing.expiresAt,
        revokedAt: existing.revokedAt,
        createdAt: existing.createdAt,
        createdBy: existing.createdBy,
        existing: true,
      }, { status: 200 })
    }

    // Revoke existing active if force
    if (existing && force) {
      // Check permission to manage the existing link
      const { canManage, reason: manageReason } = canManageEvaluationLink(session.user, existing.createdById, session.user.id)
      if (!canManage) {
        return NextResponse.json({ error: 'Forbidden', message: manageReason || 'Insufficient permissions to revoke existing link' }, { status: 403 })
      }
      await prisma.candidateEvaluationLink.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      })
    }

    const token = crypto.randomBytes(24).toString('hex')
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

    const model = (prisma as any).candidateEvaluationLink
    if (!model) {
      throw new Error('CandidateEvaluationLink model not available. Run prisma generate and database migrations.');
    }
    const created = await model.create({
      data: {
        candidateId,
        token,
        expiresAt,
        createdById: session.user.id,
        requireLogin,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      id: created.id,
      token: created.token,
      url: buildEvaluateUrl(candidateId, created.token),
      expiresAt: created.expiresAt,
      requireLogin: created.requireLogin,
      revokedAt: created.revokedAt,
      createdAt: created.createdAt,
      createdBy: created.createdBy,
    }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.errors }, { status: 400 })
    }
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const hint = typeof message === 'string' && message.toLowerCase().includes('relation')
      ? 'Database table missing. Run migrations.'
      : undefined
    return NextResponse.json({ error: 'Internal Server Error', message, hint }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const candidateId = (await params).id

    const link = await getActiveLink(candidateId)
    if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Check permission to manage the link
    const { canManage, reason } = canManageEvaluationLink(session.user, link.createdById, session.user.id)
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden', message: reason || 'Insufficient permissions' }, { status: 403 })
    }

    const model = (prisma as any).candidateEvaluationLink
    if (!model) {
      throw new Error('CandidateEvaluationLink model not available. Run prisma generate and database migrations.');
    }
    await model.update({
      where: { id: link.id },
      data: { revokedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const hint = typeof message === 'string' && message.toLowerCase().includes('relation')
      ? 'Database table missing. Run migrations.'
      : undefined
    return NextResponse.json({ error: 'Internal Server Error', message, hint }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const candidateId = (await params).id
    const body = await request.json().catch(() => ({})) as { days?: number; requireLogin?: boolean }
    const days = typeof body.days === 'number' && body.days > 0 ? body.days : undefined

    const link = await getActiveLink(candidateId)
    if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Check permission to manage the link
    const { canManage, reason } = canManageEvaluationLink(session.user, link.createdById, session.user.id)
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden', message: reason || 'Insufficient permissions' }, { status: 403 })
    }

    const model = (prisma as any).candidateEvaluationLink
    if (!model) {
      throw new Error('CandidateEvaluationLink model not available. Run prisma generate and database migrations.')
    }

    let newExpiresAt = link.expiresAt
    if (days) {
      const base = new Date(Math.max(Date.now(), new Date(link.expiresAt).getTime()))
      newExpiresAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
    }

    const updated = await model.update({
      where: { id: link.id },
      data: {
        expiresAt: newExpiresAt,
        requireLogin: typeof body.requireLogin === 'boolean' ? body.requireLogin : link.requireLogin,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      id: updated.id,
      token: updated.token,
      url: buildEvaluateUrl(candidateId, updated.token),
      expiresAt: updated.expiresAt,
      requireLogin: updated.requireLogin,
      revokedAt: updated.revokedAt,
      createdAt: updated.createdAt,
      createdBy: updated.createdBy,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const hint = typeof message === 'string' && message.toLowerCase().includes('relation')
      ? 'Database table missing. Run migrations.'
      : undefined
    return NextResponse.json({ error: 'Internal Server Error', message, hint }, { status: 500 })
  }
}


