import { auth } from '@/auth';
// src/app/api/settings/custom-field-definitions/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getPool } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const customFieldOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

const updateCustomFieldSchema = z.object({
  model_name: z.enum(['Applicant', 'Position', 'User', 'Headcount']).optional(),
  field_code: z.string().min(1, "Field code is required").regex(/^[A-Z0-9_]+$/, "Code must be uppercase alphanumeric with underscores.").optional(),
  label: z.string().min(1, "Label is required").optional(),
  field_type: z.enum(['text', 'textarea', 'number', 'boolean', 'date', 'select_single', 'select_multiple'] as const).optional(),
  
  // Role permissions - using role IDs
  viewRoles: z.array(z.string().uuid()).optional(),
  editRoles: z.array(z.string().uuid()).optional(),
  
  // Visibility settings
  showInFilter: z.boolean().optional(),
  showInApplicantDetail: z.boolean().optional(),
  showInFullApplicantDetail: z.boolean().optional(),
  showInTaskBoardFilter: z.boolean().optional(),
  showInPositionSettings: z.boolean().optional(),
  showInHeadcountDetail: z.boolean().optional(),
  
  // Section selection for display settings
  applicantDetailSection: z.enum(['jobs', 'Applicant-info', 'education', 'experience', 'job-suitability']).optional(),
  positionDetailSection: z.enum(['details', 'criteria', 'applicants', 'headcount']).optional(),
  
  // Field properties
  is_required: z.boolean().optional(),
  allowCustomOptions: z.boolean().optional(),
  sort_order: z.number().optional(),
  
  // Options for select/multiselect
  options: z.array(customFieldOptionSchema).optional().nullable(),
});

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/custom-field-definitions\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * @openapi
 * /api/settings/custom-field-definitions/{id}:
 *   get:
 *     summary: Get a custom field definition by ID
 *     description: Returns a single custom field definition. Requires authentication.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the custom field definition
 *     responses:
 *       200:
 *         description: Custom field definition found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  const id = extractIdFromUrl(request);
  if (!id) {
    return NextResponse.json({ message: "Invalid custom field definition ID" }, { status: 400 });
  }
  
  // SECURITY: Validate UUID format to prevent injection attacks
  const { validateUuid } = await import('@/lib/security');
  if (!validateUuid(id)) {
    console.error('[SECURITY] Invalid UUID format in custom-field-definitions GET request:', id);
    return NextResponse.json({ message: "Invalid custom field definition ID format" }, { status: 400 });
  }
  
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!id) {
    return NextResponse.json({ message: "Field ID is required" }, { status: 400 });
  }

  try {
    const query = `
      SELECT 
        id, model_name, field_key, field_code, label, field_type, options, 
        is_required, sort_order, attribute_code, attribute_label,
        view_roles, edit_roles, show_in_filter, show_in_applicant_detail,
        show_in_full_applicant_detail, show_in_task_board_filter,
        show_in_position_settings, show_in_headcount_detail, applicant_detail_section, position_detail_section, allow_custom_options,
        "createdAt", "updatedAt"
      FROM "CustomFieldDefinition"
      WHERE id = $1
    `;
    
    const result = await getPool().query(query, [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ message: "Custom field definition not found" }, { status: 404 });
    }

    const field = result.rows[0];
    
    // Return in the format expected by frontend
    return NextResponse.json({
      id: field.id,
      model_name: field.model_name,
      field_key: field.field_key,
      field_code: field.field_code,
      label: field.label,
      field_type: field.field_type,
      options: field.options || [],
             attributeCode: field.attribute_code,
      viewRoles: field.view_roles || [],
      editRoles: field.edit_roles || [],
      showInFilter: field.show_in_filter || false,
      showInApplicantDetail: field.show_in_applicant_detail || false,
      showInFullApplicantDetail: field.show_in_full_applicant_detail || false,
      showInTaskBoardFilter: field.show_in_task_board_filter || false,
      showInPositionSettings: field.show_in_position_settings || false,
      showInHeadcountDetail: field.show_in_headcount_detail || false,
      applicantDetailSection: field.applicant_detail_section,
      positionDetailSection: field.position_detail_section,
      is_required: field.is_required,
      allowCustomOptions: field.allow_custom_options || false,
      sort_order: field.sort_order ?? 0,
      createdAt: field.createdAt,
      updatedAt: field.updatedAt,
    }, { status: 200 });
  } catch (error: any) {
    console.error(`Failed to fetch custom field definition ${id}:`, error);
    await logAudit('ERROR', `Failed to fetch custom field definition (ID: ${id}). Error: ${error.message}`, 'API:CustomFields:GetById', session.user.id);
    return NextResponse.json({ message: "Error fetching custom field definition", error: error.message }, { status: 500 });
  }
}

/**
 * @openapi
 * /api/settings/custom-field-definitions/{id}:
 *   put:
 *     summary: Update a custom field definition by ID
 *     description: Updates a custom field definition. Requires Admin or CUSTOM_FIELDS_EDIT permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the custom field definition
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Custom field definition updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (insufficient permissions)
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
export async function PUT(request: NextRequest) {
  const id = extractIdFromUrl(request);
  if (!id) {
    return NextResponse.json({ message: "Invalid custom field definition ID" }, { status: 400 });
  }
  
  // SECURITY: Validate UUID format to prevent injection attacks
  const { validateUuid } = await import('@/lib/security');
  if (!validateUuid(id)) {
    console.error('[SECURITY] Invalid UUID format in custom-field-definitions PUT request:', id);
    return NextResponse.json({ message: "Invalid custom field definition ID format" }, { status: 400 });
  }
  
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user, 'CUSTOM_FIELDS_EDIT')) {
    await logAudit('WARN', `Forbidden attempt to update custom field by ${session.user.name}.`, 'API:CustomFields:Update', session.user.id);
    return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  if (!id) {
    return NextResponse.json({ message: "Field ID is required" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch (error: any) {
    return NextResponse.json({ message: "Error parsing request body", error: error.message }, { status: 400 });
  }

  const validationResult = updateCustomFieldSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ 
      message: "Invalid input", 
      errors: validationResult.error.flatten().fieldErrors 
    }, { status: 400 });
  }

  const updateData = validationResult.data;

  try {
    // Check if field exists
    const existingField = await getPool().query(
      'SELECT * FROM "CustomFieldDefinition" WHERE id = $1',
      [id]
    );

    if (existingField.rows.length === 0) {
      return NextResponse.json({ message: "Custom field definition not found" }, { status: 404 });
    }

    const existingFieldData = existingField.rows[0];

    // Build update query dynamically with proper field mapping
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    // Field mapping from frontend camelCase to database snake_case
    const fieldMapping: Record<string, string> = {
      model_name: 'model_name',
      field_code: 'field_code',
      label: 'label',
      field_type: 'field_type',
      viewRoles: 'view_roles',
      editRoles: 'edit_roles',
      showInFilter: 'show_in_filter',
      showInApplicantDetail: 'show_in_applicant_detail',
      showInFullApplicantDetail: 'show_in_full_applicant_detail',
      showInTaskBoardFilter: 'show_in_task_board_filter',
      showInPositionSettings: 'show_in_position_settings',
      showInHeadcountDetail: 'show_in_headcount_detail',
      applicantDetailSection: 'applicant_detail_section',
      positionDetailSection: 'position_detail_section',
      is_required: 'is_required',
      allowCustomOptions: 'allow_custom_options',
      sort_order: 'sort_order',
      options: 'options'
    };

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbField = fieldMapping[key] || key;
        updateFields.push(`"${dbField}" = $${paramIndex++}`);
        updateValues.push(value);
      }
    });

    if (updateFields.length === 0) {
      return NextResponse.json({ message: "No fields to update" }, { status: 400 });
    }

    updateFields.push(`"updatedAt" = NOW()`);
    updateValues.push(id);

    const updateQuery = `
      UPDATE "CustomFieldDefinition" 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING *;
    `;

    const result = await getPool().query(updateQuery, updateValues);
    const updatedField = result.rows[0];

    // Map database fields to frontend expected fields
    const mappedField = {
      id: updatedField.id,
      model_name: updatedField.model_name,
      field_key: updatedField.field_key,
      field_code: updatedField.field_code,
      label: updatedField.label,
      field_type: updatedField.field_type,
      options: updatedField.options || [],
      attributeCode: updatedField.attribute_code,
      viewRoles: updatedField.view_roles || [],
      editRoles: updatedField.edit_roles || [],
      showInFilter: updatedField.show_in_filter || false,
      showInApplicantDetail: updatedField.show_in_applicant_detail || false,
      showInFullApplicantDetail: updatedField.show_in_full_applicant_detail || false,
      showInTaskBoardFilter: updatedField.show_in_task_board_filter || false,
      showInPositionSettings: updatedField.show_in_position_settings || false,
      showInHeadcountDetail: updatedField.show_in_headcount_detail || false,
      applicantDetailSection: updatedField.applicant_detail_section,
      positionDetailSection: updatedField.position_detail_section,
      is_required: updatedField.is_required,
      allowCustomOptions: updatedField.allow_custom_options || false,
      sort_order: updatedField.sort_order ?? 0,
      createdAt: updatedField.createdAt,
      updatedAt: updatedField.updatedAt,
    };

    await logAudit('AUDIT', 
      `Custom field "${updatedField.label}" (${updatedField.field_key}) updated by ${session.user.name}.`, 
      'API:CustomFields:Update', 
      session.user.id, 
      { fieldId: id, changes: Object.keys(updateData) }
    );

    return NextResponse.json(mappedField, { status: 200 });
  } catch (error: any) {
    console.error(`Failed to update custom field definition ${id}:`, error);
    await logAudit('ERROR', 
      `Failed to update custom field definition (ID: ${id}). Error: ${error.message}`, 
      'API:CustomFields:Update', 
      session.user.id, 
      { fieldId: id, input: body }
    );
    return NextResponse.json({ message: "Error updating custom field definition", error: error.message }, { status: 500 });
  }
}

/**
 * @openapi
 * /api/settings/custom-field-definitions/{id}:
 *   delete:
 *     summary: Delete a custom field definition by ID
 *     description: Deletes a custom field definition. Requires Admin or CUSTOM_FIELDS_EDIT permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the custom field definition
 *     responses:
 *       200:
 *         description: Custom field definition deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (insufficient permissions)
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
export async function DELETE(request: NextRequest) {
  const id = extractIdFromUrl(request);
  if (!id) {
    return NextResponse.json({ message: "Invalid custom field definition ID" }, { status: 400 });
  }
  
  // SECURITY: Validate UUID format to prevent injection attacks
  const { validateUuid } = await import('@/lib/security');
  if (!validateUuid(id)) {
    console.error('[SECURITY] Invalid UUID format in custom-field-definitions DELETE request:', id);
    return NextResponse.json({ message: "Invalid custom field definition ID format" }, { status: 400 });
  }
  
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user, 'CUSTOM_FIELDS_EDIT')) {
    await logAudit('WARN', `Forbidden attempt to delete custom field by ${session.user.name}.`, 'API:CustomFields:Delete', session.user.id);
    return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  if (!id) {
    return NextResponse.json({ message: "Field ID is required" }, { status: 400 });
  }

  try {
    // Check if field exists and get its details
    const existingField = await getPool().query(
      'SELECT * FROM "CustomFieldDefinition" WHERE id = $1',
      [id]
    );

    if (existingField.rows.length === 0) {
      return NextResponse.json({ message: "Custom field definition not found" }, { status: 404 });
    }

    const fieldData = existingField.rows[0];

    // Check if field is being used in any records
    const usageQuery = `
      SELECT COUNT(*) as count 
      FROM "Candidate" 
      WHERE "customAttributes" ? $1
      UNION ALL
      SELECT COUNT(*) as count 
      FROM "Position" 
      WHERE "customAttributes" ? $1
    `;
    
    const usageResult = await getPool().query(usageQuery, [fieldData.field_code]);
    const totalUsage = usageResult.rows.reduce((sum: number, row: any) => sum + parseInt(row.count), 0);

    if (totalUsage > 0) {
      return NextResponse.json({ 
        message: `Cannot delete custom field "${fieldData.label}" as it is being used in ${totalUsage} record(s). Please remove the field from all records first.` 
      }, { status: 409 });
    }

    // Delete the field definition
    await getPool().query('DELETE FROM "CustomFieldDefinition" WHERE id = $1', [id]);

    await logAudit('AUDIT', 
      `Custom field "${fieldData.label}" (${fieldData.field_code}) deleted by ${session.user.name}.`, 
      'API:CustomFields:Delete', 
      session.user.id, 
      { fieldId: id, modelName: fieldData.model_name, fieldCode: fieldData.field_code }
    );

    return NextResponse.json({ message: "Custom field definition deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error(`Failed to delete custom field definition ${id}:`, error);
    await logAudit('ERROR', 
      `Failed to delete custom field definition (ID: ${id}). Error: ${error.message}`, 
      'API:CustomFields:Delete', 
      session.user.id, 
      { fieldId: id }
    );
    return NextResponse.json({ message: "Error deleting custom field definition", error: error.message }, { status: 500 });
  }
}
