import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import prisma from '@/lib/prisma';

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
    const isActive = searchParams.get('isActive');
    const includeShared = searchParams.get('includeShared') === 'true';

    // Build where clause to get user's own configurations and shared ones
    const where: any = {
      OR: [
        { createdBy: actingUserId }, // User's own configurations
        { isPublic: true } // Public configurations
      ]
    };

    // Add shared configurations if requested
    if (includeShared) {
      where.OR.push({
        sharedWith: {
          some: {
            userId: actingUserId
          }
        }
      });
    }

    if (entityType) where.AND = [{ entityType }];
    if (isActive !== null) {
      if (!where.AND) where.AND = [];
      where.AND.push({ isActive: isActive === 'true' });
    }

    const configurations = await prisma.warningConfiguration.findMany({
      where,
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        sharedWith: {
          where: {
            userId: actingUserId
          },
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    await logAudit('AUDIT', `Warning configurations accessed by ${actingUserName}`, 'API:Settings:WarningConfigurations:Get', actingUserId, {
      entityType,
      isActive,
      includeShared,
      count: configurations.length
    });

    return NextResponse.json(configurations);
  } catch (error) {
    console.error('Error getting warning configurations:', error);
    await logAudit('ERROR', `Failed to get warning configurations by ${actingUserName}`, 'API:Settings:WarningConfigurations:Get', actingUserId, {
      error: (error as Error).message
    });
    return NextResponse.json({
      error: 'Failed to get warning configurations',
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
    const { name, description, entityType, field, condition, operator, value, threshold, severity, isPublic } = body;

    if (!name || !entityType || !field || !condition || !operator) {
      await logAudit('WARN', `Warning configuration creation attempted with missing fields by ${actingUserName}`, 'API:Settings:WarningConfigurations:Post', actingUserId, {
        providedFields: { name, entityType, field, condition, operator }
      });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const configuration = await prisma.warningConfiguration.create({
      data: {
        name,
        description,
        entityType,
        field,
        condition,
        operator,
        value,
        threshold,
        severity: severity || 'warning',
        isPublic: isPublic || false,
        createdBy: actingUserId
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

    await logAudit('AUDIT', `Warning configuration '${name}' created by ${actingUserName}`, 'API:Settings:WarningConfigurations:Post', actingUserId, {
      configurationId: configuration.id,
      entityType,
      field,
      condition,
      isPublic
    });

    return NextResponse.json(configuration, { status: 201 });
  } catch (error) {
    console.error('Error creating warning configuration:', error);
    await logAudit('ERROR', `Failed to create warning configuration by ${actingUserName}`, 'API:Settings:WarningConfigurations:Post', actingUserId, {
      error: (error as Error).message
    });
    return NextResponse.json({
      error: 'Failed to create warning configuration',
      details: (error as Error).message
    }, { status: 500 });
  }
}
