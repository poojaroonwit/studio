// src/app/api/positions/import/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { logAudit } from '@/lib/auditLog';
import { authOptions } from '@/lib/auth';
import { parse as parseCsv } from 'csv-parse/sync';
import { IncomingForm, Fields, Files, File } from 'formidable';
import fs from 'fs';
import { getDefaultMatchCriteria } from '@/lib/systemSettings';



// Route segment config for handling multipart form data
export const runtime = 'nodejs';

/**
 * @openapi
 * /api/positions/import:
 *   get:
 *     summary: Get all imported positions
 *     description: Returns all imported positions. Requires authentication.
 *     responses:
 *       200:
 *         description: List of imported positions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Position'
 *   post:
 *     summary: Bulk import positions
 *     description: Import multiple positions at once. Requires authentication.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/Position'
 *     responses:
 *       201:
 *         description: Import completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *             examples:
 *               success:
 *                 summary: Example response
 *                 value:
 *                   message: "Import completed"
 *                   results:
 *                     - success: true
 *                       position:
 *                         id: "uuid"
 *                         title: "Software Engineer"
 *                         department: "Engineering"
 *                         isOpen: true
 *                         positionLevel: "mid level"
 *       401:
 *         description: Unauthorized
 */

// Zod schema for position import
const importPositionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  department: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  matchCriteria: z.string().optional().nullable(),
  isOpen: z.boolean().optional(),
  positionLevel: z.string().optional().nullable(),
  custom_attributes: z.any().optional().nullable(),
});

// Schema for array of positions
const importPositionsArraySchema = z.array(importPositionSchema);

// Helper function to detect and convert encoding
function detectAndConvertEncoding(buffer: Buffer): string {
  // For Thai language support, prioritize UTF-8
  // Check for UTF-8 BOM first
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return buffer.toString('utf-8');
  }
  
  // Try UTF-8 first (most common and required for Thai)
  try {
    const utf8String = buffer.toString('utf-8');
    // Check if it looks like valid UTF-8 by trying to parse as CSV
    try {
      parseCsv(utf8String, { columns: true, skip_empty_lines: true, max_record_size: 1000 });
      return utf8String;
    } catch (parseError) {
      // For Thai language support, we'll still use UTF-8 even if CSV parsing fails
      // The actual parsing will be done later with better error handling
      return utf8String;
    }
  } catch (error) {
    // UTF-8 conversion failed, try other encodings
  }

  // Only try other encodings if UTF-8 completely fails
  // Try Windows-1252 (common for files saved from Excel)
  try {
    const win1252String = buffer.toString('latin1');
    try {
      parseCsv(win1252String, { columns: true, skip_empty_lines: true, max_record_size: 1000 });
      return win1252String;
    } catch {
      // Windows-1252 parsing failed
    }
  } catch {
    // Windows-1252 conversion failed
  }

  // Try ISO-8859-1 as fallback
  try {
    const isoString = buffer.toString('latin1');
    return isoString;
  } catch {
    // If all else fails, return as UTF-8 and let it fail with a clear error
    return buffer.toString('utf-8');
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const actingUserId = session?.user?.id;
  const actingUserName = session?.user?.name || session?.user?.email || 'System';

  if (!actingUserId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Get default match criteria from system settings
  const defaultMatchCriteria = await getDefaultMatchCriteria();

  // Check if this is a file upload (multipart/form-data)
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    // Use the Web API formData() method
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }
    // file is a Blob (or File)
    // @ts-ignore
    const fileName = file.name || '';
    // @ts-ignore
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let positions = [];
    if (fileName.endsWith('.csv')) {
      // Parse CSV with automatic encoding detection
      let csvString = detectAndConvertEncoding(buffer);
      
      // Strip UTF-8 BOM if present
      if (csvString.charCodeAt(0) === 0xFEFF) {
        csvString = csvString.slice(1);
      }
      
      let records;
      try {
        records = parseCsv(csvString, { 
          columns: true, 
          skip_empty_lines: true,
          trim: true // Trim whitespace from headers and values
        });
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
        console.error('CSV parsing error:', parseError);
        console.error('CSV content that failed to parse:', csvString.substring(0, 1000));
        return NextResponse.json({ 
          message: 'CSV parsing failed. Please ensure the file is a valid CSV with correct headers and UTF-8 encoding (required for Thai language support).', 
          error: errorMessage,
          encoding: 'UTF-8 required for Thai language support'
        }, { status: 400 });
      }
      
      // Validate that we have the required headers
      if (records.length === 0) {
        return NextResponse.json({ 
          message: 'CSV file appears to be empty or has no valid data rows.' 
        }, { status: 400 });
      }
      
      const firstRecord = records[0];
      
      // Validate first record
      
      if (!firstRecord.title) {
        // Provide more detailed error information
        const availableHeaders = Object.keys(firstRecord);
        return NextResponse.json({ 
          message: 'CSV must have a "title" column. Please check your CSV headers.',
          details: {
            availableHeaders,
            expectedHeaders: ['title', 'department', 'description', 'isOpen', 'positionLevel', 'custom_attributes'],
            missingHeaders: ['title'].filter(h => !availableHeaders.includes(h)),
            firstRecord: firstRecord // Include the first record for debugging
          }
        }, { status: 400 });
      }

      positions = records.map((row: any) => {
        let customAttributes = {};
        if (row.custom_attributes && typeof row.custom_attributes === 'string' && row.custom_attributes.trim() !== '') {
          try {
            customAttributes = JSON.parse(row.custom_attributes);
          } catch (e) {
            customAttributes = {};
          }
        }
        
        // Combine description and job_description into a single description field
        let combinedDescription = '';
        if (row.description) {
          combinedDescription += row.description;
        }
        if (row.job_description) {
          if (combinedDescription) {
            combinedDescription += '\n\n';
          }
          combinedDescription += row.job_description;
        }
        
        return {
          title: row.title,
          department: row.department,
          description: combinedDescription || null,
          matchCriteria: (row.matchCriteria && row.matchCriteria.trim() !== '') ? row.matchCriteria : defaultMatchCriteria,
          isOpen: row.isOpen && String(row.isOpen).toLowerCase() === 'true',
          positionLevel: row.positionLevel || null,
          custom_attributes: customAttributes,
        };
      });
    } else {
      return NextResponse.json({ message: 'Only CSV import is currently supported via file upload.' }, { status: 400 });
    }
    // Validate and insert as before
    const validationResult = importPositionsArraySchema.safeParse(positions);
    if (!validationResult.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };
      for (const position of validationResult.data) {
        try {
          const existingResult = await client.query('SELECT id FROM "Position" WHERE title = $1 AND department = $2', [position.title, position.department]);
          if (existingResult.rows.length > 0) {
            results.failed++;
            results.errors.push(`Position with title "${position.title}" in department "${position.department}" already exists`);
            continue;
          }
          const insertQuery = `
            INSERT INTO "Position" (id, title, department, description, "matchCriteria", "isOpen", "positionLevel", "customAttributes", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            RETURNING *;
          `;
          const positionId = uuidv4();
          await client.query(insertQuery, [
            positionId, position.title, position.department, position.description, 
            position.matchCriteria, position.isOpen, position.positionLevel, position.custom_attributes || {}
          ]);
          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`Failed to import ${position.title}: ${error.message}`);
        }
      }
      await client.query('COMMIT');
      await logAudit('AUDIT', `Bulk import (CSV) completed by ${actingUserName}. Success: ${results.success}, Failed: ${results.failed}`, 'API:Positions:Import', actingUserId, { results });
      return NextResponse.json({
        message: 'Import completed',
        ...results
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      await logAudit('ERROR', `Bulk import failed. Error: ${error.message}`, 'API:Positions:Import', actingUserId, { input: positions });
      return NextResponse.json({ message: 'Error during import', error: error.message }, { status: 500 });
    } finally {
      client.release();
    }
  }

  // Fallback: JSON import (existing logic)
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }
  const validationResult = importPositionsArraySchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ message: 'Invalid input', errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
  }
  const positions = validationResult.data;
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };
    for (const position of positions) {
      try {
        const existingResult = await client.query('SELECT id FROM "Position" WHERE title = $1 AND department = $2', [position.title, position.department]);
        if (existingResult.rows.length > 0) {
          results.failed++;
          results.errors.push(`Position with title "${position.title}" in department "${position.department}" already exists`);
          continue;
        }
        const insertQuery = `
          INSERT INTO "Position" (id, title, department, description, "matchCriteria", "isOpen", "positionLevel", "customAttributes", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          RETURNING *;
        `;
        const positionId = uuidv4();
        await client.query(insertQuery, [
          positionId, position.title, position.department, position.description, 
          (position.matchCriteria && position.matchCriteria.trim() !== '') ? position.matchCriteria : defaultMatchCriteria, position.isOpen, position.positionLevel, position.custom_attributes || {}
        ]);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Failed to import ${position.title}: ${error.message}`);
      }
    }
    await client.query('COMMIT');
    await logAudit('AUDIT', `Bulk import completed by ${actingUserName}. Success: ${results.success}, Failed: ${results.failed}`, 'API:Positions:Import', actingUserId, { results });
    return NextResponse.json({
      message: 'Import completed',
      ...results
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    await logAudit('ERROR', `Bulk import failed. Error: ${error.message}`, 'API:Positions:Import', actingUserId, { input: body });
    return NextResponse.json({ message: 'Error during import', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const client = await getPool().connect();
  try {
    const positionsQuery = `
      SELECT * FROM "Position"
      ORDER BY "createdAt" DESC;
    `;
    const positionsResult = await client.query(positionsQuery);
    return NextResponse.json({
      data: positionsResult.rows
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error in /api/positions/import:', error);
    return NextResponse.json({ message: 'Error fetching positions', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
