import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const actingUserId = session.user.id;
  const actingUserName = session.user.name || session.user.email || 'System';

  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause to get user's accessible warnings
    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (severity) where.severity = severity;

    // Filter warnings by user's accessible configurations
    // First get accessible configuration IDs
    const accessibleConfigs = await prisma.warningConfiguration.findMany({
      where: {
        OR: [
          { isPublic: true }, // Public configurations
          { createdBy: actingUserId }, // User's own configurations
          {
            sharedWith: {
              some: {
                userId: actingUserId
              }
            }
          } // Shared configurations
        ]
      },
      select: { id: true }
    });
    
    const configIds = accessibleConfigs.map((config: any) => config.id);
    
    // If no accessible configs, return empty array
    if (configIds.length === 0) {
      return NextResponse.json([]);
    }
    
    // Add configuration ID filter to where clause
    where.configurationId = {
      in: configIds
    };

    const warnings = await prisma.warning.findMany({
      where,
      include: {
        configuration: {
          include: {
            createdByUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    await logAudit('AUDIT', `Warnings accessed by ${actingUserName}`, 'API:Warnings:Get', actingUserId, {
      entityType,
      entityId,
      severity,
      count: warnings.length
    });

    return NextResponse.json(warnings);
  } catch (error) {
    console.error('Error getting warnings:', error);
    await logAudit('ERROR', `Failed to get warnings by ${actingUserName}`, 'API:Warnings:Get', actingUserId, {
      error: (error as Error).message
    });
    return NextResponse.json({
      error: 'Failed to get warnings',
      details: (error as Error).message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const actingUserId = session.user.id;
  const actingUserName = session.user.name || session.user.email || 'System';

  try {
    const body = await request.json();
    const { configurationId, entityType, entityId, field, currentValue, expectedValue, message, severity } = body;

    if (!configurationId || !entityType || !entityId || !field || !message) {
      await logAudit('WARN', `Warning creation attempted with missing fields by ${actingUserName}`, 'API:Warnings:Post', actingUserId, {
        providedFields: { configurationId, entityType, entityId, field, message }
      });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if warning already exists for this entity and configuration
    const existingWarning = await prisma.warning.findFirst({
      where: {
        configurationId,
        entityType,
        entityId
      }
    });

    if (existingWarning) {
      // Update existing warning
      const warning = await prisma.warning.update({
        where: { id: existingWarning.id },
        data: {
          currentValue,
          expectedValue,
          message,
          severity: severity || 'warning',
          updatedAt: new Date()
        },
        include: {
          configuration: true
        }
      });

      await logAudit('AUDIT', `Warning updated by ${actingUserName}`, 'API:Warnings:Post', actingUserId, {
        warningId: warning.id,
        configurationId,
        entityType,
        entityId
      });

      return NextResponse.json(warning);
    } else {
      // Create new warning
      const warning = await prisma.warning.create({
        data: {
          configurationId,
          entityType,
          entityId,
          field,
          currentValue,
          expectedValue,
          message,
          severity: severity || 'warning'
        },
        include: {
          configuration: true
        }
      });

      await logAudit('AUDIT', `Warning created by ${actingUserName}`, 'API:Warnings:Post', actingUserId, {
        warningId: warning.id,
        configurationId,
        entityType,
        entityId
      });

      return NextResponse.json(warning, { status: 201 });
    }
  } catch (error) {
    console.error('Error creating/updating warning:', error);
    await logAudit('ERROR', `Failed to create/update warning by ${actingUserName}`, 'API:Warnings:Post', actingUserId, {
      error: (error as Error).message
    });
    return NextResponse.json({
      error: 'Failed to create/update warning',
      details: (error as Error).message
    }, { status: 500 });
  }
}
