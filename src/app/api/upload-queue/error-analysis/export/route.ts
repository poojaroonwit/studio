export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const actingUserId = session?.user?.id;
  const actingUserName = session?.user?.name || session?.user?.email || 'System';

  if (!actingUserId) {
    await logAudit('WARN', 'Unauthorized attempt to export error analysis', 'API:UploadQueue:ErrorAnalysis:Export', null);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let client: any = null;
  try {
    const { searchParams } = new URL(request.url);
    const dateStart = searchParams.get('date_start');
    const dateEnd = searchParams.get('date_end');
    const status = searchParams.get('status');
    const errorReason = searchParams.get('error_reason');
    const format = searchParams.get('format') || 'csv';

    client = await getPool().connect();

    // Build query with filters
    let query = `
      SELECT 
        id,
        file_name,
        file_size,
        status,
        error,
        error_details,
        upload_date,
        process_date,
        completed_date,
        position_title,
        source
      FROM upload_queue
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (dateStart) {
      query += ` AND upload_date >= $${paramIndex}`;
      params.push(dateStart);
      paramIndex++;
    }

    if (dateEnd) {
      query += ` AND upload_date <= $${paramIndex}`;
      params.push(dateEnd);
      paramIndex++;
    }

    if (status && status !== 'all') {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (errorReason) {
      query += ` AND (error_details = $${paramIndex} OR error = $${paramIndex})`;
      params.push(decodeURIComponent(errorReason));
      paramIndex++;
    }

    query += ` ORDER BY upload_date DESC`;

    const result = await client.query(query, params);

    // Process data for error analysis
    const queueData = result.rows;
    const errorMap = new Map<string, number>();
    const errorDetailsMap = new Map<string, any[]>();

    queueData.forEach((item: any) => {
      if (item.error) {
        const reason = item.error_details || item.error;
        errorMap.set(reason, (errorMap.get(reason) || 0) + 1);
        
        if (!errorDetailsMap.has(reason)) {
          errorDetailsMap.set(reason, []);
        }
        errorDetailsMap.get(reason)!.push({
          id: item.id,
          fileName: item.file_name,
          fileSize: item.file_size,
          status: item.status,
          uploadDate: item.upload_date,
          processDate: item.process_date,
          completedDate: item.completed_date,
          positionTitle: item.position_title,
          source: item.source,
          error: item.error,
          errorDetails: item.error_details
        });
      }
    });

    const totalJobs = queueData.length;
    const totalErrors = queueData.filter((item: any) => item.error).length;
    const errorRate = totalJobs > 0 ? ((totalErrors / totalJobs) * 100).toFixed(1) : '0.0';

    // Prepare export data
    const exportData = Array.from(errorMap.entries()).map(([reason, count], index) => {
      const percentage = ((count / totalJobs) * 100).toFixed(1);
      const severity = getErrorSeverity(count, totalJobs);
      const category = getErrorCategory(reason);
      
      return {
        'No.': index + 1,
        'Error Reason': reason,
        'Error Category': category,
        'Count': count,
        'Percentage': `${percentage}%`,
        'Severity': severity,
        'Total Jobs': totalJobs,
        'Export Date': new Date().toISOString().split('T')[0]
      };
    });

    // Add summary row
    exportData.push({
      'No.': 0,
      'Error Reason': 'SUMMARY',
      'Error Category': '',
      'Count': totalErrors,
      'Percentage': `${errorRate}%`,
      'Severity': totalErrors > 0 ? 'high' : 'low',
      'Total Jobs': totalJobs,
      'Export Date': new Date().toISOString().split('T')[0]
    });

    // Add detailed error information
    const detailedData = Array.from(errorDetailsMap.entries()).flatMap(([reason, details]) =>
      details.map((detail: any) => ({
        'Error Reason': reason,
        'Error Category': getErrorCategory(reason),
        'File Name': detail.fileName,
        'File Size (bytes)': detail.fileSize,
        'Status': detail.status,
        'Upload Date': detail.uploadDate,
        'Process Date': detail.processDate,
        'Completed Date': detail.completedDate,
        'Position Title': detail.positionTitle,
        'Source': detail.source,
        'Error Message': detail.error,
        'Error Details': detail.errorDetails
      }))
    );

    if (format === 'excel') {
      // For Excel format, we'll return JSON that can be processed by the frontend
      const excelData = {
        summary: exportData,
        details: detailedData,
        metadata: {
          totalJobs,
          totalErrors,
          errorRate: `${errorRate}%`,
          exportDate: new Date().toISOString(),
          filters: {
            dateStart,
            dateEnd,
            status
          }
        }
      };

      await logAudit('AUDIT', `Error analysis exported as Excel by ${actingUserName}. ${exportData.length - 1} error types exported.`, 'API:UploadQueue:ErrorAnalysis:Export', actingUserId, { 
        exportCount: exportData.length - 1,
        format: 'Excel',
        totalJobs,
        totalErrors
      });

      return NextResponse.json(excelData);
    } else {
      // CSV format
      const headers = Object.keys(exportData[0]);
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            const escapedValue = String(value).replace(/"/g, '""');
            return `"${escapedValue}"`;
          }).join(',')
        )
      ].join('\n');

      await logAudit('AUDIT', `Error analysis exported as CSV by ${actingUserName}. ${exportData.length - 1} error types exported.`, 'API:UploadQueue:ErrorAnalysis:Export', actingUserId, { 
        exportCount: exportData.length - 1,
        format: 'CSV',
        totalJobs,
        totalErrors
      });

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv;charset=utf-8',
          'Content-Disposition': `attachment; filename="error-analysis-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

  } catch (error) {
    console.error('Error exporting error analysis:', error);
    
    await logAudit('ERROR', `Failed to export error analysis by ${actingUserName}. Error: ${(error as Error).message}`, 'API:UploadQueue:ErrorAnalysis:Export', actingUserId, { 
      error: (error as Error).message 
    });
    
    return NextResponse.json({ error: 'Failed to export error analysis' }, { status: 500 });
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

function getErrorSeverity(count: number, totalJobs: number): 'high' | 'medium' | 'low' {
  const errorRate = (count / totalJobs) * 100;
  if (errorRate > 10) return 'high';
  if (errorRate > 2) return 'medium';
  return 'low';
}

function getErrorCategory(reason: string): string {
  if (reason.includes('timeout')) return 'Timeout Error';
  if (reason.includes('connection')) return 'Network Error';
  if (reason.includes('invalid')) return 'Invalid Data Error';
  if (reason.includes('parsing')) return 'Parsing Error';
  if (reason.includes('file')) return 'File Processing Error';
  if (reason.includes('api')) return 'API Error';
  if (reason.includes('database')) return 'Database Error';
  return 'Unknown Error';
}
