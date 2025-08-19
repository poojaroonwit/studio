const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addGradeSystem() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Adding Grade System...');
    
    // Create Grade table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Grade" (
        "id" UUID NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "min_level" INTEGER NOT NULL,
        "max_level" INTEGER NOT NULL,
        "sla_days" INTEGER NOT NULL,
        "color" TEXT DEFAULT '#3B82F6',
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
      );
    `);

    // Create unique constraint on name
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Grade_name_key" ON "Grade"("name");
    `);

    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS "Grade_min_level_idx" ON "Grade"("min_level");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Grade_max_level_idx" ON "Grade"("max_level");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Grade_is_active_idx" ON "Grade"("is_active");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Grade_sort_order_idx" ON "Grade"("sort_order");`);

    // Add gradeId and hiringDate columns to Position table
    await client.query(`ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "gradeId" UUID;`);
    await client.query(`ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "hiringDate" TIMESTAMP(3);`);

    // Create indexes for new columns
    await client.query(`CREATE INDEX IF NOT EXISTS "Position_gradeId_idx" ON "Position"("gradeId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Position_hiringDate_idx" ON "Position"("hiringDate");`);

    // Add foreign key constraint
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Position_gradeId_fkey') THEN
          ALTER TABLE "Position" ADD CONSTRAINT "Position_gradeId_fkey" 
          FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // Check if grades already exist
    const existingGrades = await client.query('SELECT COUNT(*) FROM "Grade"');
    
    if (existingGrades.rows[0].count === '0') {
      // Insert default grades based on the KPI requirements
      await client.query(`
        INSERT INTO "Grade" ("id", "name", "description", "min_level", "max_level", "sla_days", "color", "sort_order", "updatedAt") VALUES
          (gen_random_uuid(), 'Grade 8+', 'ระดับเกรด 8 ขึ้นไป', 8, 999, 60, '#EF4444', 1, CURRENT_TIMESTAMP),
          (gen_random_uuid(), 'Grade 6-7', 'ระดับเกรด 6-7', 6, 7, 45, '#F59E0B', 2, CURRENT_TIMESTAMP),
          (gen_random_uuid(), 'Grade 3-5', 'ระดับเกรด 3-5', 3, 5, 30, '#10B981', 3, CURRENT_TIMESTAMP),
          (gen_random_uuid(), 'Grade 1-2 & Contract', 'ระดับเกรด 1-2 และพนักงานสัญญาจ้าง/รายวัน', 1, 2, 15, '#3B82F6', 4, CURRENT_TIMESTAMP);
      `);
      console.log('✅ Default grades created');
    } else {
      console.log('ℹ️  Grades already exist, skipping creation');
    }

    console.log('✅ Grade system added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding grade system:', error);
    throw error;
  } finally {
    client.release();
  }
}

addGradeSystem()
  .then(() => {
    console.log('🎉 Grade system setup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Grade system setup failed:', error);
    process.exit(1);
  });
