// src/app/api/positions/export/route.ts
import { NextResponse } from 'next/server';
import { hasPermission } from '@/lib/permissions';
import { getServerSession } from 'next-auth/next';
import { getPool } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import * as XLSX from 'xlsx';
import { logAudit } from '@/lib/auditLog';

/**
 * @openapi
 * /api/positions/export:
 *   get:
 *     summary: Export positions
 *     description: Export all positions.
 *     responses:
 *       200:
 *         description: Exported positions data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *             examples:
 *               success:
 *                 summary: Example response
 *                 value:
 *                   ok: true
 */

// Helper function to convert data to Excel format
function convertToExcel(data: any[]): Buffer {
  if (!data || data.length === 0) {
    // Create empty workbook with headers
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Positions');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  // Clean and format the data for Excel
  const cleanedData = data.map(row => {
    const cleanedRow: any = {};
    Object.keys(row).forEach(key => {
      let value = row[key];
      
      // Handle null/undefined values
      if (value === null || value === undefined) {
        value = '';
      }
      
      // Convert dates to readable format
      if (value instanceof Date) {
        value = value.toLocaleDateString();
      }
      
      // Handle boolean values
      if (typeof value === 'boolean') {
        value = value ? 'Yes' : 'No';
      }
      
      // Clean up HTML content if present
      if (typeof value === 'string' && value.includes('<')) {
        // Remove HTML tags for cleaner Excel output
        value = value.replace(/<[^>]*>/g, '').trim();
      }
      
      cleanedRow[key] = value;
    });
    return cleanedRow;
  });

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(cleanedData);
  
  // Auto-size columns
  const columnWidths = Object.keys(cleanedData[0] || {}).map(key => ({
    wch: Math.max(key.length, 15) // Minimum width of 15 characters
  }));
  worksheet['!cols'] = columnWidths;
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Positions');
  
  // Generate Excel file as buffer
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const actingUserId = session?.user?.id;
  const actingUserName = session?.user?.name || session?.user?.email || 'System';

  if (!actingUserId) {
    await logAudit('WARN', 'Unauthorized attempt to export positions', 'API:Positions:Export', null);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to export positions
  if (!session?.user || !hasPermission(session.user, 'POSITIONS_EXPORT')) {
    await logAudit('WARN', `Forbidden attempt to export positions by ${actingUserName}`, 'API:Positions:Export', actingUserId);
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to export positions' }, { status: 403 });
  }

  let client: any = null;
  try {
    client = await getPool().connect();
    const result = await client.query('SELECT * FROM "Position" ORDER BY "createdAt" DESC');

    const excelBuffer = convertToExcel(result.rows);

    await logAudit('AUDIT', `Positions exported by ${actingUserName}. ${result.rows.length} positions exported.`, 'API:Positions:Export', actingUserId, { 
      exportCount: result.rows.length,
      format: 'Excel' 
    });

    // Wrap Buffer for Web Response body
    const body = new Uint8Array(excelBuffer);

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="positions-export.xlsx"',
      },
    });
  } catch (error) {
    await logAudit('ERROR', `Failed to export positions by ${actingUserName}. Error: ${(error as Error).message}`, 'API:Positions:Export', actingUserId, { 
      error: (error as Error).message 
    });
    return NextResponse.json({ error: 'Failed to export positions' }, { status: 500 });
  } finally {
    // ✅ CRITICAL FIX: Always release the database client
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('Error releasing database client:', releaseError);
      }
    }
  }
}
