// src/app/api/positions/import/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { logAudit } from '@/lib/auditLog';
import { parse as parseCsv } from 'csv-parse/sync';
import { IncomingForm, Fields, Files, File } from 'formidable';
import fs from 'fs';
import { getDefaultMatchCriteria } from '@/lib/systemSettings';
import { broadcastPositionListUpdated, broadcastPositionStatisticsUpdated } from '@/lib/simple-broadcaster';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';
// Route segment config for handling multipart form data
export const runtime = 'nodejs';

// Configuration constants
const BATCH_SIZE = 50; // Process positions in batches of 50
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
const TIMEOUT_MS = 300000; // 5 minutes timeout
const MAX_POSITIONS = 1000; // Maximum positions per import

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

// Batch processing function for better performance
async function processBatch(client: any, positions: any[], defaultMatchCriteria: string) {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  // Use a single query to check for existing positions
  const existingTitles = positions.map(p => [p.title, p.department]);
  const existingQuery = `
    SELECT title, department FROM "Position" 
    WHERE (title, department) IN (${existingTitles.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ')})
  `;
  const existingParams = existingTitles.flat();
  const existingResult = await client.query(existingQuery, existingParams);
  const existingSet = new Set(existingResult.rows.map((row: any) => `${row.title}|${row.department}`));

  // Filter out existing positions
  const newPositions = positions.filter(pos => !existingSet.has(`${pos.title}|${pos.department}`));
  
  if (newPositions.length === 0) {
    results.failed = positions.length;
    results.errors.push(`All ${positions.length} positions already exist`);
    return results;
  }

  // Batch insert new positions
  const insertValues = newPositions.map((pos, index) => {
    const baseIndex = index * 8;
    return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, NOW(), NOW())`;
  }).join(', ');

  const insertQuery = `
    INSERT INTO "Position" (id, title, department, description, "matchCriteria", "isOpen", "positionLevel", "customAttributes", "createdAt", "updatedAt")
    VALUES ${insertValues}
    RETURNING id, title, department;
  `;

  const insertParams = newPositions.flatMap(pos => [
    uuidv4(),
    pos.title,
    pos.department,
    pos.description,
    pos.matchCriteria || defaultMatchCriteria,
    pos.isOpen,
    pos.positionLevel,
    pos.custom_attributes || {}
  ]);

  try {
    await client.query(insertQuery, insertParams);
    results.success = newPositions.length;
  } catch (error: any) {
    results.failed = newPositions.length;
    results.errors.push(`Batch insert failed: ${error.message}`);
  }

  // Add failed count for existing positions
  results.failed += positions.length - newPositions.length;
  if (positions.length - newPositions.length > 0) {
    results.errors.push(`${positions.length - newPositions.length} positions already exist`);
  }

  return results;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const actingUserId = session?.user?.id;
  const actingUserName = (session?.user?.name || session?.user?.email || actingUserId || 'System') as string;

  if (!actingUserId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Get default match criteria from system settings
  const defaultMatchCriteria = await getDefaultMatchCriteria();

  // Check if this is a file upload (multipart/form-data)
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    try {
      // Use the Web API formData() method
      const formData = await request.formData();
      const file = formData.get('file');
      if (!file || typeof file === 'string') {
        return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
      }

      // Check file size
      const fileSize = file.size;
      if (fileSize > MAX_FILE_SIZE) {
        return NextResponse.json({ 
          message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
        }, { status: 400 });
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

        // Check position count limit
        if (records.length > MAX_POSITIONS) {
          return NextResponse.json({ 
            message: `Too many positions. Maximum allowed is ${MAX_POSITIONS}. Found ${records.length} positions.` 
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

      // Validate positions
      const validationResult = importPositionsArraySchema.safeParse(positions);
      if (!validationResult.success) {
        return NextResponse.json({ message: 'Invalid input', errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
      }

      // Process positions in batches
      const client = await getPool().connect();
      const startTime = Date.now();
      
      try {
        await client.query('BEGIN');
        
        const totalResults = {
          success: 0,
          failed: 0,
          errors: [] as string[],
          processingTime: 0
        };

        // Process in batches
        for (let i = 0; i < validationResult.data.length; i += BATCH_SIZE) {
          const batch = validationResult.data.slice(i, i + BATCH_SIZE);
          const batchResults = await processBatch(client, batch, defaultMatchCriteria);
          
          totalResults.success += batchResults.success;
          totalResults.failed += batchResults.failed;
          totalResults.errors.push(...batchResults.errors);

          // Check timeout
          if (Date.now() - startTime > TIMEOUT_MS) {
            await client.query('ROLLBACK');
            return NextResponse.json({ 
              message: 'Import timeout. Please try with a smaller file or contact support.',
              partialResults: totalResults
            }, { status: 408 });
          }
        }

        await client.query('COMMIT');
        totalResults.processingTime = Date.now() - startTime;

        // Broadcast real-time updates after successful import
        if (totalResults.success > 0) {
          try {
            // Broadcast position list update to refresh dropdowns and lists
            broadcastPositionListUpdated();
            
            // Broadcast updated statistics
            const statsQuery = `
              SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN "isOpen" = TRUE THEN 1 END) as open,
                COUNT(CASE WHEN "isOpen" = FALSE THEN 1 END) as closed
              FROM "Position"
            `;
            const statsResult = await client.query(statsQuery);
            const stats = statsResult.rows[0];
            const statistics = { 
              total: parseInt(stats.total, 10), 
              open: parseInt(stats.open, 10), 
              closed: parseInt(stats.closed, 10) 
            };
            broadcastPositionStatisticsUpdated(statistics);
          } catch (broadcastError) {
            console.error('Failed to broadcast real-time updates after CSV import:', broadcastError);
            // Don't fail the request if broadcasting fails
          }
        }

        await logAudit('AUDIT', `Bulk import (CSV) completed by ${actingUserName}. Success: ${totalResults.success}, Failed: ${totalResults.failed}, Time: ${totalResults.processingTime}ms`, 'API:Positions:Import', actingUserId, { results: totalResults });
        
        return NextResponse.json({
          message: 'Import completed',
          ...totalResults
        });
      } catch (error: any) {
        await client.query('ROLLBACK');
        await logAudit('ERROR', `Bulk import failed. Error: ${error.message}`, 'API:Positions:Import', actingUserId, { input: positions });
        return NextResponse.json({ message: 'Error during import', error: error.message }, { status: 500 });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('Import error:', error);
      // SECURITY: Never expose detailed error messages in production
      const isDevelopment = process.env.NODE_ENV === 'development';
      return NextResponse.json({ 
        message: 'Error processing file',
        ...(isDevelopment && { error: error.message })
      }, { status: 500 });
    }
  }

  // Fallback: JSON import (existing logic) - also optimized
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
  
  // Check position count limit
  if (positions.length > MAX_POSITIONS) {
    return NextResponse.json({ 
      message: `Too many positions. Maximum allowed is ${MAX_POSITIONS}. Found ${positions.length} positions.` 
    }, { status: 400 });
  }

  const client = await getPool().connect();
  const startTime = Date.now();
  
  try {
    await client.query('BEGIN');
    
    const totalResults = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      processingTime: 0
    };

    // Process in batches
    for (let i = 0; i < positions.length; i += BATCH_SIZE) {
      const batch = positions.slice(i, i + BATCH_SIZE);
      const batchResults = await processBatch(client, batch, defaultMatchCriteria);
      
      totalResults.success += batchResults.success;
      totalResults.failed += batchResults.failed;
      totalResults.errors.push(...batchResults.errors);

      // Check timeout
      if (Date.now() - startTime > TIMEOUT_MS) {
        await client.query('ROLLBACK');
        return NextResponse.json({ 
          message: 'Import timeout. Please try with fewer positions or contact support.',
          partialResults: totalResults
        }, { status: 408 });
      }
    }

    await client.query('COMMIT');
    totalResults.processingTime = Date.now() - startTime;

    // Broadcast real-time updates after successful import
    if (totalResults.success > 0) {
      try {
        // Broadcast position list update to refresh dropdowns and lists
        broadcastPositionListUpdated();
        
        // Broadcast updated statistics
        const statsQuery = `
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN "isOpen" = TRUE THEN 1 END) as open,
            COUNT(CASE WHEN "isOpen" = FALSE THEN 1 END) as closed
          FROM "Position"
        `;
        const statsResult = await client.query(statsQuery);
        const stats = statsResult.rows[0];
        const statistics = { 
          total: parseInt(stats.total, 10), 
          open: parseInt(stats.open, 10), 
          closed: parseInt(stats.closed, 10) 
        };
        broadcastPositionStatisticsUpdated(statistics);
      } catch (broadcastError) {
        console.error('Failed to broadcast real-time updates after import:', broadcastError);
        // Don't fail the request if broadcasting fails
      }
    }

    await logAudit('AUDIT', `Bulk import completed by ${actingUserName}. Success: ${totalResults.success}, Failed: ${totalResults.failed}, Time: ${totalResults.processingTime}ms`, 'API:Positions:Import', actingUserId, { results: totalResults });
    
    return NextResponse.json({
      message: 'Import completed',
      ...totalResults
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
  const session = await auth();
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
