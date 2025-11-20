// src/app/api/settings/custom-field-definitions/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getPool } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { v4 as uuidv4 } from 'uuid';
import type { CustomFieldType } from '@/lib/types';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const createCustomFieldSchema = z.object({
  model_name: z.enum(['Candidate', 'Position', 'User', 'Headcount']),
  field_code: z.string().min(1, "Field code is required").regex(/^[A-Z0-9_]+$/, "Code must be uppercase alphanumeric with underscores."),
  label: z.string().min(1, "Label is required"),
  field_type: z.enum(['text', 'textarea', 'number', 'boolean', 'date', 'select_single', 'select_multiple']),
  
  // Role permissions - using role IDs (UUIDs)
  viewRoles: z.array(z.string().uuid()).default([]).or(z.string().transform(() => [])),
  editRoles: z.array(z.string().uuid()).default([]).or(z.string().transform(() => [])),
  
  // Visibility settings
  showInFilter: z.boolean().default(false),
  showInCandidateDetail: z.boolean().default(false),
  showInFullCandidateDetail: z.boolean().default(false),
  showInTaskBoardFilter: z.boolean().default(false),
  showInPositionSettings: z.boolean().default(false),
  showInHeadcountDetail: z.boolean().default(false),
  
  // Section selection for display settings
  candidateDetailSection: z.enum(['jobs', 'candidate-info', 'education', 'experience', 'job-suitability']).optional().nullable(),
  positionDetailSection: z.enum(['details', 'criteria', 'candidates', 'headcount']).optional().nullable(),
  
  // Field properties
  is_required: z.boolean().default(false),
  allowCustomOptions: z.boolean().default(false),
  sort_order: z.number().default(0),
  
  // Options for select/multiselect
  options: z.array(z.object({
    id: z.string().optional(),
    value: z.string().min(1, "Option value is required"),
    label: z.string().min(1, "Option label is required"),
    color: z.string().optional(),
    sortOrder: z.number().default(0),
    isActive: z.boolean().default(true),
  })).optional().default([]).or(z.string().transform(() => [])),
});

const updateCustomFieldSchema = createCustomFieldSchema.partial().omit({ model_name: true, field_code: true });

/**
 * @openapi
 * /api/settings/custom-field-definitions:
 *   get:
 *     summary: Get custom field definitions
 *     description: Returns all custom field definitions for candidates or positions. Requires authentication.
 *     parameters:
 *       - in: query
 *         name: model
 *         schema:
 *           type: string
 *           enum: [Candidate, Position, User, Headcount]
 *         description: Filter by model name (Candidate, Position, User, or Headcount)
 *     responses:
 *       200:
 *         description: List of custom field definitions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *   post:
 *     summary: Create a custom field definition
 *     description: Creates a new custom field definition. Requires Admin or CUSTOM_FIELDS_EDIT permission.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               model:
 *                 type: string
 *                 enum: [Candidate, Position, User, Headcount]
 *               name:
 *                 type: string
 *               label:
 *                 type: string
 *               type:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               isRequired:
 *                 type: boolean
 *               isFilterable:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Custom field definition created
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
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const modelName = searchParams.get('model') as 'Candidate' | 'Position' | 'User' | 'Headcount' | null;

  try {
    let query = `
      SELECT 
        id, model_name, field_key, field_code, label, field_type, options, 
        is_required, sort_order, attribute_code, attribute_label,
        view_roles, edit_roles, show_in_filter, show_in_candidate_detail,
        show_in_full_candidate_detail, show_in_task_board_filter,
        show_in_position_settings, show_in_headcount_detail, candidate_detail_section, position_detail_section, allow_custom_options,
        "createdAt", "updatedAt"
      FROM "CustomFieldDefinition"
    `;
    const queryParams: any[] = [];

    if (modelName) {
      query += ' WHERE model_name = $1';
      queryParams.push(modelName);
    }

    query += ' ORDER BY sort_order ASC, label ASC';

    const result = await getPool().query(query, queryParams);
    
    // Map DB fields to frontend expected fields
    const mappedRows = result.rows.map((row: any) => ({
      id: row.id,
      model_name: row.model_name,
      field_key: row.field_key,
      field_code: row.field_code,
      label: row.label,
      field_type: row.field_type,
      options: row.options || [],
             attributeCode: row.attribute_code,
      viewRoles: row.view_roles || [],
      editRoles: row.edit_roles || [],
      showInFilter: row.show_in_filter || false,
      showInCandidateDetail: row.show_in_candidate_detail || false,
      showInFullCandidateDetail: row.show_in_full_candidate_detail || false,
      showInTaskBoardFilter: row.show_in_task_board_filter || false,
      showInPositionSettings: row.show_in_position_settings || false,
      showInHeadcountDetail: row.show_in_headcount_detail || false,
      candidateDetailSection: row.candidate_detail_section,
      positionDetailSection: row.position_detail_section,
      is_required: row.is_required,
      allowCustomOptions: row.allow_custom_options || false,
      sort_order: row.sort_order ?? 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    return NextResponse.json(mappedRows, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch custom field definitions:", error);
    await logAudit('ERROR', `Failed to fetch custom field definitions. Error: ${error.message}`, 'API:CustomFields:GetAll', session.user.id);
    return NextResponse.json({ message: "Error fetching custom field definitions", error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user, 'CUSTOM_FIELDS_EDIT')) {
    await logAudit('WARN', `Forbidden attempt to create custom field by ${session.user.name}.`, 'API:CustomFields:Create', session.user.id);
    return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch (error: any) {
    return NextResponse.json({ message: "Error parsing request body", error: error.message }, { status: 400 });
  }

  const validationResult = createCustomFieldSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ 
      message: "Invalid input", 
      errors: validationResult.error.flatten().fieldErrors 
    }, { status: 400 });
  }

  const { 
    model_name, field_code, label, field_type,
    viewRoles, editRoles, showInFilter, showInCandidateDetail, showInFullCandidateDetail,
    showInTaskBoardFilter, showInPositionSettings, showInHeadcountDetail, candidateDetailSection, positionDetailSection,
    is_required, allowCustomOptions, sort_order, options 
  } = validationResult.data;

  try {
    // Check if field code already exists for this model
    const existingField = await getPool().query(
      'SELECT id FROM "CustomFieldDefinition" WHERE model_name = $1 AND field_code = $2',
      [model_name, field_code]
    );

    if (existingField.rows.length > 0) {
      return NextResponse.json({ 
        message: `A custom field with code "${field_code}" already exists for ${model_name}` 
      }, { status: 409 });
    }

    const newFieldId = uuidv4();
    const insertQuery = `
      INSERT INTO "CustomFieldDefinition" (
        id, model_name, field_key, field_code, label, field_type, options, 
        is_required, sort_order, attribute_code, attribute_label,
        view_roles, edit_roles, show_in_filter, show_in_candidate_detail,
        show_in_full_candidate_detail, show_in_task_board_filter,
        show_in_position_settings, show_in_headcount_detail, candidate_detail_section, position_detail_section, allow_custom_options,
        "createdAt", "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW())
      RETURNING *;
    `;

         const result = await getPool().query(insertQuery, [
       newFieldId, model_name, field_code, field_code, label, field_type, 
       options || null, is_required, sort_order, field_code, null,
       viewRoles || [], editRoles || [], showInFilter, showInCandidateDetail,
       showInFullCandidateDetail, showInTaskBoardFilter, showInPositionSettings, showInHeadcountDetail, 
       candidateDetailSection, positionDetailSection, allowCustomOptions
     ]);

    const newField = result.rows[0];

    await logAudit('AUDIT', 
      `Custom field "${label}" (${field_code}) created for ${model_name} by ${session.user.name}.`, 
      'API:CustomFields:Create', 
      session.user.id, 
      { fieldId: newFieldId, modelName: model_name, fieldCode: field_code, fieldType: field_type }
    );

    // Return in the format expected by frontend
    return NextResponse.json({
      id: newField.id,
      model_name: newField.model_name,
      field_key: newField.field_key,
      field_code: newField.field_code,
      label: newField.label,
      field_type: newField.field_type,
      options: newField.options || [],
             attributeCode: newField.attribute_code,
      viewRoles: newField.view_roles || [],
      editRoles: newField.edit_roles || [],
      showInFilter: newField.show_in_filter || false,
      showInCandidateDetail: newField.show_in_candidate_detail || false,
      showInFullCandidateDetail: newField.show_in_full_candidate_detail || false,
      showInTaskBoardFilter: newField.show_in_task_board_filter || false,
      showInPositionSettings: newField.show_in_position_settings || false,
      showInHeadcountDetail: newField.show_in_headcount_detail || false,
      candidateDetailSection: newField.candidate_detail_section,
      positionDetailSection: newField.position_detail_section,
      is_required: newField.is_required,
      allowCustomOptions: newField.allow_custom_options || false,
      sort_order: newField.sort_order ?? 0,
      createdAt: newField.createdAt,
      updatedAt: newField.updatedAt,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create custom field definition:", error);
    await logAudit('ERROR', 
      `Failed to create custom field definition. Error: ${error.message}`, 
      'API:CustomFields:Create', 
      session.user.id, 
      { input: body }
    );
    return NextResponse.json({ message: "Error creating custom field definition", error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user, 'CUSTOM_FIELDS_EDIT')) {
    await logAudit('WARN', `Forbidden attempt to update custom field by ${session.user.name}.`, 'API:CustomFields:Update', session.user.id);
    return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch (error: any) {
    return NextResponse.json({ message: "Error parsing request body", error: error.message }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const fieldId = searchParams.get('id');

  if (!fieldId) {
    return NextResponse.json({ message: "Field ID is required" }, { status: 400 });
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
      'SELECT id FROM "CustomFieldDefinition" WHERE id = $1',
      [fieldId]
    );

    if (existingField.rows.length === 0) {
      return NextResponse.json({ message: "Custom field not found" }, { status: 404 });
    }

    // Build dynamic update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (updateData.label !== undefined) {
      updateFields.push(`label = $${paramIndex++}`);
      updateValues.push(updateData.label);
    }

    if (updateData.field_type !== undefined) {
      updateFields.push(`field_type = $${paramIndex++}`);
      updateValues.push(updateData.field_type);
    }

    if (updateData.options !== undefined) {
      updateFields.push(`options = $${paramIndex++}`);
      updateValues.push(updateData.options);
    }



    if (updateData.viewRoles !== undefined) {
      updateFields.push(`view_roles = $${paramIndex++}`);
      updateValues.push(updateData.viewRoles);
    }

    if (updateData.editRoles !== undefined) {
      updateFields.push(`edit_roles = $${paramIndex++}`);
      updateValues.push(updateData.editRoles);
    }

    if (updateData.showInFilter !== undefined) {
      updateFields.push(`show_in_filter = $${paramIndex++}`);
      updateValues.push(updateData.showInFilter);
    }

    if (updateData.showInCandidateDetail !== undefined) {
      updateFields.push(`show_in_candidate_detail = $${paramIndex++}`);
      updateValues.push(updateData.showInCandidateDetail);
    }

    if (updateData.showInFullCandidateDetail !== undefined) {
      updateFields.push(`show_in_full_candidate_detail = $${paramIndex++}`);
      updateValues.push(updateData.showInFullCandidateDetail);
    }

    if (updateData.showInTaskBoardFilter !== undefined) {
      updateFields.push(`show_in_task_board_filter = $${paramIndex++}`);
      updateValues.push(updateData.showInTaskBoardFilter);
    }

    if (updateData.showInPositionSettings !== undefined) {
      updateFields.push(`show_in_position_settings = $${paramIndex++}`);
      updateValues.push(updateData.showInPositionSettings);
    }

    if (updateData.showInHeadcountDetail !== undefined) {
      updateFields.push(`show_in_headcount_detail = $${paramIndex++}`);
      updateValues.push(updateData.showInHeadcountDetail);
    }

    if (updateData.candidateDetailSection !== undefined) {
      updateFields.push(`candidate_detail_section = $${paramIndex++}`);
      updateValues.push(updateData.candidateDetailSection);
    }

    if (updateData.positionDetailSection !== undefined) {
      updateFields.push(`position_detail_section = $${paramIndex++}`);
      updateValues.push(updateData.positionDetailSection);
    }

    if (updateData.is_required !== undefined) {
      updateFields.push(`is_required = $${paramIndex++}`);
      updateValues.push(updateData.is_required);
    }

    if (updateData.allowCustomOptions !== undefined) {
      updateFields.push(`allow_custom_options = $${paramIndex++}`);
      updateValues.push(updateData.allowCustomOptions);
    }

    if (updateData.sort_order !== undefined) {
      updateFields.push(`sort_order = $${paramIndex++}`);
      updateValues.push(updateData.sort_order);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ message: "No fields to update" }, { status: 400 });
    }

    updateFields.push(`"updatedAt" = NOW()`);
    updateValues.push(fieldId);

    const updateQuery = `
      UPDATE "CustomFieldDefinition" 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;

    const result = await getPool().query(updateQuery, updateValues);
    const updatedField = result.rows[0];

    await logAudit('AUDIT', 
      `Custom field "${updatedField.label}" (${updatedField.field_code}) updated by ${session.user.name}.`, 
      'API:CustomFields:Update', 
      session.user.id, 
      { fieldId, fieldCode: updatedField.field_code, fieldType: updatedField.field_type }
    );

    // Return in the format expected by frontend
    return NextResponse.json({
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
      showInCandidateDetail: updatedField.show_in_candidate_detail || false,
      showInFullCandidateDetail: updatedField.show_in_full_candidate_detail || false,
      showInTaskBoardFilter: updatedField.show_in_task_board_filter || false,
      showInPositionSettings: updatedField.show_in_position_settings || false,
      showInHeadcountDetail: updatedField.show_in_headcount_detail || false,
      candidateDetailSection: updatedField.candidate_detail_section,
      positionDetailSection: updatedField.position_detail_section,
      is_required: updatedField.is_required,
      allowCustomOptions: updatedField.allow_custom_options || false,
      sort_order: updatedField.sort_order ?? 0,
      createdAt: updatedField.createdAt,
      updatedAt: updatedField.updatedAt,
    }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to update custom field definition:", error);
    await logAudit('ERROR', `Failed to update custom field definition. Error: ${error.message}`, 'API:CustomFields:Update', session.user.id);
    return NextResponse.json({ message: "Error updating custom field definition", error: error.message }, { status: 500 });
  }
}
