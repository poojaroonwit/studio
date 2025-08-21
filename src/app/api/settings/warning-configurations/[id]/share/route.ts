import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import prisma from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const actingUserId = session.user.id;
  const actingUserName = session.user.name || session.user.email || 'System';

  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if user owns this configuration
    const configuration = await prisma.warningConfiguration.findFirst({
      where: {
        id: params.id,
        createdBy: actingUserId
      }
    });

    if (!configuration) {
      return NextResponse.json({ error: 'Warning configuration not found or access denied' }, { status: 404 });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Create or update share record
    const shareRecord = await prisma.warningConfigurationShare.upsert({
      where: {
        configurationId_userId: {
          configurationId: params.id,
          userId: userId
        }
      },
      update: {}, // No fields to update since this is just a relationship
      create: {
        configurationId: params.id,
        userId: userId
      }
    });

    await logAudit('AUDIT', `Warning configuration '${configuration.name}' shared with user ${targetUser.name} by ${actingUserName}`, 'API:Settings:WarningConfigurations:Share', actingUserId, {
      configurationId: params.id,
      targetUserId: userId
    });

    return NextResponse.json(shareRecord, { status: 201 });
  } catch (error) {
    console.error('Error sharing warning configuration:', error);
    await logAudit('ERROR', `Failed to share warning configuration by ${actingUserName}`, 'API:Settings:WarningConfigurations:Share', actingUserId, {
      error: (error as Error).message,
      configurationId: params.id
    });
    return NextResponse.json({
      error: 'Failed to share warning configuration',
      details: (error as Error).message
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const actingUserId = session.user.id;
  const actingUserName = session.user.name || session.user.email || 'System';

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if user owns this configuration
    const configuration = await prisma.warningConfiguration.findFirst({
      where: {
        id: params.id,
        createdBy: actingUserId
      }
    });

    if (!configuration) {
      return NextResponse.json({ error: 'Warning configuration not found or access denied' }, { status: 404 });
    }

    // Remove share record
    await prisma.warningConfigurationShare.delete({
      where: {
        configurationId_userId: {
          configurationId: params.id,
          userId: userId
        }
      }
    });

    await logAudit('AUDIT', `Warning configuration '${configuration.name}' unshared from user ${userId} by ${actingUserName}`, 'API:Settings:WarningConfigurations:Unshare', actingUserId, {
      configurationId: params.id,
      targetUserId: userId
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unsharing warning configuration:', error);
    await logAudit('ERROR', `Failed to unshare warning configuration by ${actingUserName}`, 'API:Settings:WarningConfigurations:Unshare', actingUserId, {
      error: (error as Error).message,
      configurationId: params.id
    });
    return NextResponse.json({
      error: 'Failed to unshare warning configuration',
      details: (error as Error).message
    }, { status: 500 });
  }
}
