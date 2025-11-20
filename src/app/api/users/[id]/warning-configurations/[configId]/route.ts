export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/auditLog';
import { hasAnyPermission } from '@/lib/permissions';

// PUT - Update warning configuration
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; configId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, configId } = await params;

    // Check if user is updating their own configuration or has warning configurations management permission
    const hasWarningManagePermission = hasAnyPermission(session.user, ['WARNING_CONFIGURATIONS_MANAGE']);
    const isUpdatingOwn = session.user.id === id;
    
    if (!isUpdatingOwn && !hasWarningManagePermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify the configuration belongs to the user
    const existingConfig = await prisma.warningConfiguration.findFirst({
      where: {
        id: configId,
        createdBy: id,
      },
    });

    if (!existingConfig) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
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
      isPublic,
      conditionGroups,
    } = body;

    // Validate required fields - either legacy fields or new condition groups
    const hasLegacyFields = name && entityType && field && condition;
    const hasConditionGroups = name && conditionGroups && Array.isArray(conditionGroups) && conditionGroups.length > 0;
    
    if (!hasLegacyFields && !hasConditionGroups) {
      return NextResponse.json(
        { error: 'Missing required fields. Either provide legacy fields (entityType, field, condition) or conditionGroups' },
        { status: 400 }
      );
    }

    // Update the warning configuration
    const configuration = await prisma.warningConfiguration.update({
      where: { id: configId },
      data: {
        name,
        description,
        entityType: entityType || null,
        field: field || null,
        condition: condition || null,
        operator: operator || null,
        value: value || null,
        threshold: threshold || null,
        severity,
        isActive: isActive !== undefined ? isActive : true,
        isPublic: isPublic || false,
        conditionGroups: conditionGroups || [],
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log the audit event
    await logAudit(
      'AUDIT',
      `Warning configuration '${name}' updated by ${session.user.name || session.user.email}`,
      'API:WarningConfigurations:Update',
      session.user.id,
      {
        configurationName: name,
        entityType,
        field,
        condition,
        severity,
        conditionGroups: conditionGroups ? conditionGroups.length : 0,
        forUserId: id,
      }
    );

    return NextResponse.json(configuration);
  } catch (error) {
    console.error('Error updating user warning configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Partial update (e.g., toggle isActive)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; configId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, configId } = await params;

    // Check if user is updating their own configuration or has warning configurations management permission
    const hasWarningManagePermission = hasAnyPermission(session.user, ['WARNING_CONFIGURATIONS_MANAGE']);
    const isUpdatingOwn = session.user.id === id;
    
    if (!isUpdatingOwn && !hasWarningManagePermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify the configuration belongs to the user
    const existingConfig = await prisma.warningConfiguration.findFirst({
      where: {
        id: configId,
        createdBy: id,
      },
    });

    if (!existingConfig) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    const body = await request.json();

    // Update the warning configuration
    const configuration = await prisma.warningConfiguration.update({
      where: { id: configId },
      data: body,
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log the audit event
    await logAudit(
      'AUDIT',
      `Warning configuration '${existingConfig.name}' partially updated by ${session.user.name || session.user.email}`,
      'API:WarningConfigurations:Patch',
      session.user.id,
      {
        configurationName: existingConfig.name,
        partialUpdate: true,
        updatedFields: Object.keys(body),
        forUserId: id,
      }
    );

    return NextResponse.json(configuration);
  } catch (error) {
    console.error('Error patching user warning configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete warning configuration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; configId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, configId } = await params;

    // Check if user is deleting their own configuration or has warning configurations management permission
    const hasWarningManagePermission = hasAnyPermission(session.user, ['WARNING_CONFIGURATIONS_MANAGE']);
    const isDeletingOwn = session.user.id === id;
    
    if (!isDeletingOwn && !hasWarningManagePermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify the configuration belongs to the user
    const existingConfig = await prisma.warningConfiguration.findFirst({
      where: {
        id: configId,
        createdBy: id,
      },
    });

    if (!existingConfig) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    // Delete the warning configuration
    await prisma.warningConfiguration.delete({
      where: { id: configId },
    });

    // Log the audit event
    await logAudit(
      'AUDIT',
      `Warning configuration '${existingConfig.name}' deleted by ${session.user.name || session.user.email}`,
      'API:WarningConfigurations:Delete',
      session.user.id,
      {
        configurationName: existingConfig.name,
        entityType: existingConfig.entityType,
        field: existingConfig.field,
        condition: existingConfig.condition,
        forUserId: id,
      }
    );

    return NextResponse.json({ message: 'Configuration deleted successfully' });
  } catch (error) {
    console.error('Error deleting user warning configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
