import { NextRequest, NextResponse } from 'next/server';
import { hasPermission } from '@/lib/permissions';
import { logAudit } from '@/lib/auditLog';
import prisma from '@/lib/prisma';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to view warnings
  // Users should be able to view warnings if they can view candidates or have warning-specific permissions
  if (!hasPermission(session.user, 'CANDIDATES_VIEW') && 
      !hasPermission(session.user, 'WARNINGS_VIEW')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to view warnings' }, { status: 403 });
  }

  const actingUserId = session.user.id;
  const actingUserName = (session.user.name || session.user.email || actingUserId || 'System') as string;

  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '50');
    const userId = searchParams.get('userId'); // For user-specific warnings

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
          { createdBy: userId || actingUserId }, // User's own configurations (or specific user if provided)
          {
            sharedWith: {
              some: {
                userId: userId || actingUserId
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
    where.configuration_id = {
      in: configIds
    };

    const warnings = await prisma.warning.findMany({
      where,
      include: {
        configuration: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: limit
    });

    // Transform the warnings to use camelCase field names for frontend compatibility
    const transformedWarnings = warnings.map((warning: any) => ({
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

    await logAudit('AUDIT', `Warnings accessed by ${actingUserName}`, 'API:Warnings:Get', actingUserId, {
      entityType,
      entityId,
      severity,
      count: warnings.length
    });

    return NextResponse.json(transformedWarnings);
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
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to create/update warnings
  // Users should be able to manage warnings if they can edit candidates or have warning-specific permissions
  if (!hasPermission(session.user, 'CANDIDATES_EDIT_BASIC') && 
      !hasPermission(session.user, 'WARNINGS_MANAGE')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to manage warnings' }, { status: 403 });
  }

  const actingUserId = session.user.id;
  const actingUserName = (session.user.name || session.user.email || actingUserId || 'System') as string;

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
        configuration_id: configurationId,
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
          updated_at: new Date()
        },
        include: {
          configuration: {
            select: {
              id: true,
              name: true,
              description: true
            }
          }
        }
      });

      await logAudit('AUDIT', `Warning updated by ${actingUserName}`, 'API:Warnings:Post', actingUserId, {
        warningId: warning.id,
        configurationId,
        entityType,
        entityId
      });

      // Transform the warning to use camelCase field names
      const transformedWarning = {
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
      };

      return NextResponse.json(transformedWarning);
    } else {
      // Create new warning
      const warning = await prisma.warning.create({
        data: {
          configuration_id: configurationId,
          entityType,
          entityId,
          field,
          currentValue,
          expectedValue,
          message,
          severity: severity || 'warning',
          updated_at: new Date()
        },
        include: {
          configuration: {
            select: {
              id: true,
              name: true,
              description: true
            }
          }
        }
      });

      await logAudit('AUDIT', `Warning created by ${actingUserName}`, 'API:Warnings:Post', actingUserId, {
        warningId: warning.id,
        configurationId,
        entityType,
        entityId
      });

      // Transform the warning to use camelCase field names
      const transformedWarning = {
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
      };

      return NextResponse.json(transformedWarning, { status: 201 });
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
