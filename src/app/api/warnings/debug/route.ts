import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { WarningService } from '@/lib/warningService';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const actingUserId = session.user.id;

  try {
    const body = await request.json();
    const { entityType, entityId } = body;

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get all active configurations for this entity type
    const configurations = await prisma.warningConfiguration.findMany({
      where: {
        entityType,
        isActive: true,
        OR: [
          { isPublic: true },
          { createdBy: actingUserId },
          {
            sharedWith: {
              some: {
                userId: actingUserId
              }
            }
          }
        ]
      }
    });

    // Get entity data
    let entity;
    switch (entityType) {
      case 'position':
        entity = await prisma.position.findUnique({
          where: { id: entityId },
          include: { grade: true }
        });
        break;
      case 'candidate':
        entity = await prisma.candidate.findUnique({
          where: { id: entityId },
          include: { 
            position: {
              include: {
                grade: true
              }
            }
          }
        });
        break;
      case 'headcount':
        entity = await prisma.headcount.findUnique({
          where: { id: entityId },
          include: { position: true, candidate: true }
        });
        break;
      default:
        entity = null;
    }

    // Check each configuration manually
    const debugResults = [];
    for (const config of configurations) {
      const result = await WarningService.checkWarning(config, entityType, entityId);
      debugResults.push({
        configuration: {
          id: config.id,
          name: config.name,
          field: config.field,
          condition: config.condition,
          operator: config.operator,
          value: config.value,
          logicalOperator: config.logicalOperator,
          conditions: config.conditions,
          crossEntityConditions: config.crossEntityConditions
        },
        result,
        entityData: entity
      });
    }

    // Get existing warnings for this entity
    const existingWarnings = await prisma.warning.findMany({
      where: {
        entityType,
        entityId
      },
      include: {
        configuration: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Trigger the actual warning creation/update
    await WarningService.createOrUpdateWarnings(entityType, entityId, actingUserId);

    // Get updated warnings
    const updatedWarnings = await prisma.warning.findMany({
      where: {
        entityType,
        entityId
      },
      include: {
        configuration: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Transform warnings to use camelCase field names
    const transformWarnings = (warnings: any[]) => warnings.map(warning => ({
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

    return NextResponse.json({
      entityType,
      entityId,
      entity,
      configurations: configurations.length,
      debugResults,
      existingWarnings: transformWarnings(existingWarnings),
      updatedWarnings: transformWarnings(updatedWarnings),
      warningsCreated: updatedWarnings.length - existingWarnings.length
    });

  } catch (error) {
    console.error('Error in warning debug:', error);
    return NextResponse.json({
      error: 'Failed to debug warnings',
      details: (error as Error).message
    }, { status: 500 });
  }
}
