export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { canViewEvaluationLinks } from '@/lib/permissions'

import { auth } from '@/auth';
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check permission to view evaluation links
    const { canView, reason } = canViewEvaluationLinks(session.user)
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden', message: reason || 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const candidateId = searchParams.get('candidateId') || undefined
    const status = searchParams.get('status') || undefined // active | expired | revoked | all
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10) || 0

    const now = new Date()

    const where: any = {}
    if (candidateId) where.candidateId = candidateId
    if (status && status !== 'all') {
      if (status === 'active') {
        where.revokedAt = null
        where.expiresAt = { gt: now }
      } else if (status === 'expired') {
        where.revokedAt = null
        where.expiresAt = { lte: now }
      } else if (status === 'revoked') {
        where.revokedAt = { not: null }
      }
    }

    if (q) {
      where.OR = [
        { token: { contains: q, mode: 'insensitive' } },
        { candidate: { name: { contains: q, mode: 'insensitive' } } },
        { candidate: { email: { contains: q, mode: 'insensitive' } } },
      ]
    }

    const [total, items] = await Promise.all([
      prisma.candidateEvaluationLink.count({ where }),
      prisma.candidateEvaluationLink.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          candidate: { 
            select: { 
              id: true, 
              name: true, 
              email: true,
              avatarUrl: true,
              customAttributes: true,
              position: {
                select: {
                  id: true,
                  title: true,
                }
              }
            }
          },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
    ])

    const data = items.map((it: any) => {
      // Extract interview details from customAttributes
      const customAttrs = it.candidate?.customAttributes || {};
      const interviewDate = customAttrs.interviewDateTime || customAttrs.interviewDate || null;
      const interviewLocation = customAttrs.interviewLocation || null;
      const interviewers = customAttrs.interviewers || [];

      return {
        id: it.id,
        candidate: {
          ...it.candidate,
          position: it.candidate?.position || null,
        },
        createdBy: it.createdBy,
        token: it.token,
        url: `${(process.env.NEXTAUTH_URL || 'http://localhost:8021')}/candidates/${encodeURIComponent(it.candidateId)}/evaluate?token=${encodeURIComponent(it.token)}`,
        expiresAt: it.expiresAt,
        revokedAt: it.revokedAt,
        requireLogin: it.requireLogin,
        createdAt: it.createdAt,
        // Interview details
        interviewDateTime: interviewDate,
        interviewLocation: interviewLocation,
        interviewers: interviewers,
      };
    })

    return NextResponse.json({ total, limit, offset, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const hint = typeof message === 'string' && message.toLowerCase().includes('relation')
      ? 'Database table missing. Run migrations.'
      : undefined
    return NextResponse.json({ error: 'Internal Server Error', message, hint }, { status: 500 })
  }
}


