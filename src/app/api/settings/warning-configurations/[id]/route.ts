import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import prisma from '@/lib/prisma';

export async function GET(
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
    const configuration = await prisma.warningConfiguration.findFirst({
      where: {
        id: params.id,
        OR: [
          { createdBy: actingUserId } as any,
          { isPublic: true },
          {
            sharedWith: {
              some: {
                userId: actingUserId
              }
            }
          }
        ]
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        sharedWith: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!configuration) {
      return NextResponse.json({ error: 'Warning configuration not found or access denied' }, { status: 404 });
    }

    await logAudit('AUDIT', `Warning configuration '${configuration.name}' accessed by ${actingUserName}`, 'API:Settings:WarningConfigurations:GetById', actingUserId, {
      configurationId: params.id
    });

    return NextResponse.json(configuration);
  } catch (error) {
    console.error('Error getting warning configuration:', error);
    await logAudit('ERROR', `Failed to get warning configuration by ${actingUserName}`, 'API:Settings:WarningConfigurations:GetById', actingUserId, {
      error: (error as Error).message,
      configurationId: params.id
    });
    return NextResponse.json({
      error: 'Failed to get warning configuration',
      details: (error as Error).message
    }, { status: 500 });
  }
}

export async function PUT(
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
    const { name, description, entityType, field, condition, operator, value, threshold, severity, isActive, isPublic } = body;

    // Check if user has permission to edit this configuration
    const existingConfiguration = await prisma.warningConfiguration.findFirst({
      where: {
        id: params.id,
        OR: [
          { createdBy: actingUserId } as any,
          {
            sharedWith: {
              some: {
                userId: actingUserId,
                canEdit: true
              }
            }
          }
        ]
      }
    });

    if (!existingConfiguration) {
      return NextResponse.json({ error: 'Warning configuration not found or access denied' }, { status: 404 });
    }

    const configuration = await prisma.warningConfiguration.update({
      where: { id: params.id },
      data: {
        name,
        description,
        entityType,
        field,
        condition,
        operator,
        value,
        threshold,
        severity,
        isActive,
        isPublic
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    await logAudit('AUDIT', `Warning configuration '${configuration.name}' updated by ${actingUserName}`, 'API:Settings:WarningConfigurations:Put', actingUserId, {
      configurationId: params.id,
      entityType,
      field,
      condition,
      isPublic
    });

    return NextResponse.json(configuration);
  } catch (error) {
    console.error('Error updating warning configuration:', error);
    await logAudit('ERROR', `Failed to update warning configuration by ${actingUserName}`, 'API:Settings:WarningConfigurations:Put', actingUserId, {
      error: (error as Error).message,
      configurationId: params.id
    });
    return NextResponse.json({
      error: 'Failed to update warning configuration',
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
    // Check if user has permission to delete this configuration
    const existingConfiguration = await prisma.warningConfiguration.findFirst({
      where: {
        id: params.id,
        OR: [
          { createdBy: actingUserId } as any,
          {
            sharedWith: {
              some: {
                userId: actingUserId,
                canDelete: true
              }
            }
          }
        ]
      }
    });

    if (!existingConfiguration) {
      return NextResponse.json({ error: 'Warning configuration not found or access denied' }, { status: 404 });
    }

    await prisma.warningConfiguration.delete({
      where: { id: params.id }
    });

    await logAudit('AUDIT', `Warning configuration '${existingConfiguration.name}' deleted by ${actingUserName}`, 'API:Settings:WarningConfigurations:Delete', actingUserId, {
      configurationId: params.id
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting warning configuration:', error);
    await logAudit('ERROR', `Failed to delete warning configuration by ${actingUserName}`, 'API:Settings:WarningConfigurations:Delete', actingUserId, {
      error: (error as Error).message,
      configurationId: params.id
    });
    return NextResponse.json({
      error: 'Failed to delete warning configuration',
      details: (error as Error).message
    }, { status: 500 });
  }
}
