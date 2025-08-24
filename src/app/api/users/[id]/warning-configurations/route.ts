import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/auditLog';

// GET - Fetch user's warning configurations
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Check if user is accessing their own configurations, is admin, or has warning configurations management permission
    const isAdmin = session.user.role === 'Admin';
    const hasWarningManagePermission = session.user.modulePermissions?.includes('WARNING_CONFIGURATIONS_MANAGE');
    const isAccessingOwn = session.user.id === id;
    
    if (!isAccessingOwn && !isAdmin && !hasWarningManagePermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const configurations = await prisma.warningConfiguration.findMany({
      where: {
        createdBy: id,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(configurations);
  } catch (error) {
    console.error('Error fetching user warning configurations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new warning configuration for user
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Check if user is creating their own configuration, is admin, or has warning configurations management permission
    const isAdmin = session.user.role === 'Admin';
    const hasWarningManagePermission = session.user.modulePermissions?.includes('WARNING_CONFIGURATIONS_MANAGE');
    const isCreatingOwn = session.user.id === id;
    
    if (!isCreatingOwn && !isAdmin && !hasWarningManagePermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    // Create the warning configuration
    const configuration = await prisma.warningConfiguration.create({
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
        createdByUser: {
          connect: {
            id: id,
          },
        },
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
      `Warning configuration '${name}' created by ${session.user.name || session.user.email}`,
      'API:WarningConfigurations:Create',
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

    return NextResponse.json(configuration, { status: 201 });
  } catch (error) {
    console.error('Error creating user warning configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
