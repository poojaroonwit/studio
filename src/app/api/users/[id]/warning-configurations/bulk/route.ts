import { auth } from '@/auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/auditLog';
import { hasAnyPermission } from '@/lib/permissions';

// GET - Export all warning configurations for a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if user is accessing their own configurations or has warning configurations management permission
    const hasWarningManagePermission = hasAnyPermission(session.user, ['WARNING_CONFIGURATIONS_MANAGE']);
    const isAccessingOwn = session.user.id === id;
    
    if (!isAccessingOwn && !hasWarningManagePermission) {
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

    // Get user details for export metadata
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const exportData = {
      configurations: configurations.map((config: any) => ({
        name: config.name,
        description: config.description,
        entityType: config.entityType,
        field: config.field,
        condition: config.condition,
        operator: config.operator,
        value: config.value,
        threshold: config.threshold,
        severity: config.severity,
        isActive: config.isActive,
        isPublic: config.isPublic,
        conditionGroups: config.conditionGroups,
      })),
      user: user,
      exportedAt: new Date().toISOString(),
      version: '1.0',
      totalCount: configurations.length
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error('Error exporting user warning configurations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Import multiple warning configurations for a user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if user is creating their own configurations or has warning configurations management permission
    const hasWarningManagePermission = hasAnyPermission(session.user, ['WARNING_CONFIGURATIONS_MANAGE']);
    const isCreatingOwn = session.user.id === id;
    
    if (!isCreatingOwn && !hasWarningManagePermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { configurations } = body;

    // Validate the imported data
    if (!configurations || !Array.isArray(configurations)) {
      return NextResponse.json(
        { error: 'Invalid import format: missing configurations array' },
        { status: 400 }
      );
    }

    if (configurations.length === 0) {
      return NextResponse.json(
        { error: 'No configurations to import' },
        { status: 400 }
      );
    }

    // Import each configuration
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const config of configurations) {
      try {
        // Validate required fields for each configuration
        const hasLegacyFields = config.name && config.entityType && config.field && config.condition;
        const hasConditionGroups = config.name && config.conditionGroups && Array.isArray(config.conditionGroups) && config.conditionGroups.length > 0;
        
        if (!hasLegacyFields && !hasConditionGroups) {
          results.push({
            name: config.name || 'Unknown',
            success: false,
            error: 'Missing required fields'
          });
          errorCount++;
          continue;
        }

        // Create the configuration
        const createdConfig = await prisma.warningConfiguration.create({
          data: {
            name: config.name,
            description: config.description,
            entityType: config.entityType || null,
            field: config.field || null,
            condition: config.condition || null,
            operator: config.operator || null,
            value: config.value || null,
            threshold: config.threshold || null,
            severity: config.severity || 'warning',
            isActive: config.isActive !== undefined ? config.isActive : true,
            isPublic: config.isPublic || false,
            conditionGroups: config.conditionGroups || [],
            createdByUser: {
              connect: {
                id: id,
              },
            },
          },
        });

        results.push({
          name: config.name,
          success: true,
          id: createdConfig.id
        });
        successCount++;

        // Log the audit event for each successful import
        await logAudit(
          'AUDIT',
          `Warning configuration '${config.name}' created via bulk import by ${session.user.name || session.user.email}`,
          'API:WarningConfigurations:BulkImport',
          session.user.id,
          {
            configurationName: config.name,
            entityType: config.entityType,
            field: config.field,
            condition: config.condition,
            severity: config.severity,
            conditionGroups: config.conditionGroups ? config.conditionGroups.length : 0,
            forUserId: id,
            imported: true,
          }
        );

      } catch (error) {
        console.error('Error importing configuration:', config.name, error);
        results.push({
          name: config.name || 'Unknown',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        errorCount++;
      }
    }

    // Log the bulk import audit event
    await logAudit(
      'AUDIT',
      `Bulk import of ${successCount} warning configurations completed by ${session.user.name || session.user.email}`,
      'API:WarningConfigurations:BulkImport',
      session.user.id,
      {
        totalImported: successCount,
        totalFailed: errorCount,
        forUserId: id,
        importResults: results,
      }
    );

    return NextResponse.json({
      message: `Import completed: ${successCount} successful, ${errorCount} failed`,
      results,
      summary: {
        total: configurations.length,
        successful: successCount,
        failed: errorCount
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error importing user warning configurations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
