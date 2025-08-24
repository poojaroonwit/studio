import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/auditLog';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entityType, entityId, configurationId, clearAll } = await request.json();
    const actingUserId = session.user.id;
    const actingUserName = session.user.name || 'Unknown User';

    // Validate input
    if (clearAll) {
      // Clear all warnings for the user
      const deletedCount = await prisma.warning.deleteMany({
        where: {
          configuration: {
            OR: [
              { createdBy: actingUserId },
              { isPublic: true },
              {
                sharedWith: {
                  some: {
                    userId: actingUserId
                  }
                }
              }
            ]
          }
        }
      });

      await logAudit('AUDIT', `All warnings cleared by ${actingUserName}`, 'API:Warnings:Clear', actingUserId, {
        action: 'clear_all',
        warningsCleared: deletedCount.count
      });

      return NextResponse.json({ 
        success: true, 
        message: `Cleared ${deletedCount.count} warnings`,
        warningsCleared: deletedCount.count
      });
    }

    if (entityType && entityId) {
      // Clear warnings for specific entity
      const whereClause: any = {
        entityType,
        entityId
      };

      if (configurationId) {
        whereClause.configuration_id = configurationId;
      }

      const deletedCount = await prisma.warning.deleteMany({
        where: whereClause
      });

      await logAudit('AUDIT', `Warnings cleared for ${entityType} ${entityId} by ${actingUserName}`, 'API:Warnings:Clear', actingUserId, {
        action: 'clear_entity',
        entityType,
        entityId,
        configurationId,
        warningsCleared: deletedCount.count
      });

      return NextResponse.json({ 
        success: true, 
        message: `Cleared ${deletedCount.count} warnings for ${entityType} ${entityId}`,
        warningsCleared: deletedCount.count
      });
    }

    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });

  } catch (error) {
    console.error('Error clearing warnings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 });
    }

    // Get warnings for the entity
    const warnings = await prisma.warning.findMany({
      where: {
        entityType,
        entityId,
        configuration: {
          OR: [
            { createdBy: session.user.id },
            { isPublic: true },
            {
              sharedWith: {
                some: {
                  userId: session.user.id
                }
              }
            }
          ]
        }
      },
      include: {
        configuration: {
          select: {
            name: true,
            description: true,
            severity: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Transform warnings to use camelCase field names
    const transformedWarnings = warnings.map(warning => ({
      id: warning.id,
      configurationId: warning.configuration_id,
      entityType: warning.entityType,
      entityId: warning.entityId,
      field: warning.field,
      currentValue: warning.currentValue,
      expectedValue: warning.expectedValue,
      message: warning.message,
      severity: warning.severity,
      createdAt: warning.created_at,
      updatedAt: warning.updated_at,
      configuration: warning.configuration
    }));

    return NextResponse.json({ warnings: transformedWarnings });

  } catch (error) {
    console.error('Error getting warnings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
