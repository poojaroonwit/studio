export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const id = (await params).id

    const link = await prisma.candidateEvaluationLink.findUnique({ where: { id } })
    if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json().catch(() => ({})) as { requireLogin?: boolean }
    
    const updated = await prisma.candidateEvaluationLink.update({
      where: { id },
      data: {
        requireLogin: typeof body.requireLogin === 'boolean' ? body.requireLogin : link.requireLogin,
      },
    })

    return NextResponse.json({
      id: updated.id,
      requireLogin: updated.requireLogin,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: 'Internal Server Error', message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const id = (await params).id

    const link = await prisma.candidateEvaluationLink.findUnique({ where: { id } })
    if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.candidateEvaluationLink.update({ where: { id }, data: { revokedAt: new Date() } })
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: 'Internal Server Error', message }, { status: 500 })
  }
}


