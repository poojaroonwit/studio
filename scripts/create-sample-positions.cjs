const { Pool } = require('pg');
require('dotenv').config();

async function createSamplePositions() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🌱 Creating sample positions with hiring dates for SLA testing...');

    // Get the grade IDs
    const gradeResult = await pool.query('SELECT id, name, "sla_days" FROM "Grade" ORDER BY "sort_order"');
    const grades = gradeResult.rows;
    
    if (grades.length === 0) {
      console.log('❌ No grades found. Please run the seed script first.');
      return;
    }

    // Get a recruiter user
    const userResult = await pool.query('SELECT id, name FROM "User" WHERE role = $1 LIMIT 1', ['Recruiter']);
    const recruiter = userResult.rows[0];

    if (!recruiter) {
      console.log('❌ No recruiter found. Please create a recruiter user first.');
      return;
    }

    // Calculate dates for SLA testing
    const now = new Date();
    const pastDates = [
      new Date(now.getTime() - (45 * 24 * 60 * 60 * 1000)), // 45 days ago - should be overdue for 30-day SLA
      new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000)), // 60 days ago - should be overdue for 45-day SLA
      new Date(now.getTime() - (100 * 24 * 60 * 60 * 1000)), // 100 days ago - should be overdue for 90-day SLA
      new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000)), // 15 days ago - should be within SLA
      new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000)),  // 5 days ago - should be within SLA
    ];

    const samplePositions = [
      {
        title: 'Senior Software Engineer - React',
        department: 'Engineering',
        description: 'We are looking for a senior React developer with 5+ years of experience.',
        gradeId: grades.find(g => g.name === 'Senior')?.id,
        hiringDate: pastDates[0].toISOString(),
        recruiterId: recruiter.id,
        isOpen: true
      },
      {
        title: 'Product Manager - Mobile Apps',
        department: 'Product',
        description: 'Experienced product manager for mobile application development.',
        gradeId: grades.find(g => g.name === 'Mid-Level')?.id,
        hiringDate: pastDates[1].toISOString(),
        recruiterId: recruiter.id,
        isOpen: true
      },
      {
        title: 'Lead Data Scientist',
        department: 'Data Science',
        description: 'Lead data scientist with machine learning expertise.',
        gradeId: grades.find(g => g.name === 'Lead')?.id,
        hiringDate: pastDates[2].toISOString(),
        recruiterId: recruiter.id,
        isOpen: true
      },
      {
        title: 'Junior Frontend Developer',
        department: 'Engineering',
        description: 'Entry-level frontend developer position.',
        gradeId: grades.find(g => g.name === 'Junior')?.id,
        hiringDate: pastDates[3].toISOString(),
        recruiterId: recruiter.id,
        isOpen: true
      },
      {
        title: 'UX Designer',
        department: 'Design',
        description: 'User experience designer for web applications.',
        gradeId: grades.find(g => g.name === 'Mid-Level')?.id,
        hiringDate: pastDates[4].toISOString(),
        recruiterId: recruiter.id,
        isOpen: true
      },
      {
        title: 'DevOps Engineer',
        department: 'Engineering',
        description: 'DevOps engineer with cloud infrastructure experience.',
        gradeId: grades.find(g => g.name === 'Senior')?.id,
        hiringDate: new Date(now.getTime() - (10 * 24 * 60 * 60 * 1000)).toISOString(),
        recruiterId: recruiter.id,
        isOpen: true
      },
      {
        title: 'Marketing Specialist',
        department: 'Marketing',
        description: 'Digital marketing specialist with social media experience.',
        gradeId: grades.find(g => g.name === 'Junior')?.id,
        hiringDate: new Date(now.getTime() - (25 * 24 * 60 * 60 * 1000)).toISOString(),
        recruiterId: recruiter.id,
        isOpen: true
      },
      {
        title: 'Sales Manager',
        department: 'Sales',
        description: 'Experienced sales manager for enterprise clients.',
        gradeId: grades.find(g => g.name === 'Senior')?.id,
        hiringDate: new Date(now.getTime() - (70 * 24 * 60 * 60 * 1000)).toISOString(),
        recruiterId: recruiter.id,
        isOpen: true
      }
    ];

    let createdCount = 0;
    for (const position of samplePositions) {
      try {
        const result = await pool.query(`
          INSERT INTO "Position" (
            id, title, department, description, "gradeId", "hiringDate", 
            "recruiterId", "isOpen", "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
          ) RETURNING id, title
        `, [
          position.title,
          position.department,
          position.description,
          position.gradeId,
          position.hiringDate,
          position.recruiterId,
          position.isOpen
        ]);

        console.log(`✅ Created position: ${result.rows[0].title} (ID: ${result.rows[0].id})`);
        createdCount++;
      } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`⚠️  Position "${position.title}" already exists, skipping...`);
        } else {
          console.error(`❌ Error creating position "${position.title}":`, error.message);
        }
      }
    }

    console.log(`\n🎉 Successfully created ${createdCount} sample positions with hiring dates!`);
    console.log('📊 These positions will now appear in SLA monitoring with various violation states:');
    console.log('   - Some positions are overdue (should show violations)');
    console.log('   - Some positions are within SLA (should show as on track)');
    console.log('   - Different grades have different SLA periods (30, 45, 60, 90 days)');

  } catch (error) {
    console.error('❌ Error creating sample positions:', error);
  } finally {
    await pool.end();
  }
}

createSamplePositions();
