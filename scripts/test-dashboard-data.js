import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load environment variables
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Constants from DashboardPageClient
const BACKLOG_EXCLUSION_STATUSES = ['Hired', 'Rejected', 'Offer Accepted'];

async function testDashboardData() {
  console.log('🧪 Testing dashboard data logic...');
  console.log(`📊 Database URL: ${process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***:***@')}`);

  try {
    const client = await pool.connect();
    
    // Fetch candidates (same query as in the fix)
    const candidatesQuery = `
      SELECT c.*, p.id as "positionId", p.title as "positionTitle", p.department as "positionDepartment", p."positionLevel" as "positionLevel",
             r.id as "recruiterId", r.name as "recruiterName"
      FROM "Candidate" c
      LEFT JOIN "Position" p ON c."positionId" = p.id
      LEFT JOIN "User" r ON c."recruiterId" = r.id
      ORDER BY c."applicationDate" DESC;
    `;
    const candidatesResult = await client.query(candidatesQuery);
    
    console.log(`📊 Total candidates fetched: ${candidatesResult.rows.length}`);
    
    // Transform candidates data (same logic as in the fix)
    const candidates = candidatesResult.rows.map(row => {
      let customAttributes = row.customAttributes || {};
      if (typeof customAttributes === 'string') {
        try {
          customAttributes = JSON.parse(customAttributes);
        } catch {
          customAttributes = {};
        }
      }
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone || null,
        avatarUrl: row.avatarUrl || null,
        dataAiHint: row.dataAiHint || null,
        resumePath: row.resumePath || null,
        parsedData: row.parsedData || { personal_info: {}, contact_info: {} },
        customAttributes,
        position: row.positionId ? {
          id: row.positionId,
          title: row.positionTitle,
          department: row.positionDepartment,
          positionLevel: row.positionLevel
        } : null,
        fitScore: row.fitScore || null,
        status: row.status,
        applicationDate: row.applicationDate,
        recruiter: row.recruiterId ? {
          id: row.recruiterId,
          name: row.recruiterName,
          email: null
        } : null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        transitionHistory: row.transitionHistory || [],
      };
    });

    console.log('\n📋 Candidates with their status:');
    candidates.forEach((candidate, index) => {
      console.log(`   ${index + 1}. ${candidate.name} - Status: ${candidate.status}`);
    });

    // Test the totalActiveCandidates logic (same as in DashboardPageClient)
    const totalActiveCandidates = candidates.filter(c => !BACKLOG_EXCLUSION_STATUSES.includes(c.status)).length;
    console.log(`\n📊 Total Active Candidates (excluding ${BACKLOG_EXCLUSION_STATUSES.join(', ')}): ${totalActiveCandidates}`);

    // Test status distribution
    const statusCounts = {};
    candidates.forEach(candidate => {
      statusCounts[candidate.status] = (statusCounts[candidate.status] || 0) + 1;
    });
    
    console.log('\n📊 Status distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      const isExcluded = BACKLOG_EXCLUSION_STATUSES.includes(status);
      console.log(`   - ${status}: ${count} ${isExcluded ? '(EXCLUDED from active)' : '(INCLUDED in active)'}`);
    });

    client.release();
  } catch (error) {
    console.error('❌ Error testing dashboard data:', error.message);
  } finally {
    await pool.end();
  }
}

testDashboardData(); 