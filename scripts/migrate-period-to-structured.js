#!/usr/bin/env node

/**
 * Migration script to convert period strings to structured date fields
 * This script migrates existing candidate data from period strings to structured date fields
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Month name to number mapping
const monthMap = {
  'jan': 1, 'january': 1,
  'feb': 2, 'february': 2,
  'mar': 3, 'march': 3,
  'apr': 4, 'april': 4,
  'may': 5,
  'jun': 6, 'june': 6,
  'jul': 7, 'july': 7,
  'aug': 8, 'august': 8,
  'sep': 9, 'september': 9,
  'oct': 10, 'october': 10,
  'nov': 11, 'november': 11,
  'dec': 12, 'december': 12,
};

/**
 * Parse period string to structured date fields
 * @param {string} period - Period string like "Jan 2022 - Dec 2024" or "Jan 2022 - Present"
 * @returns {Object} Structured date object
 */
function parsePeriodToStructured(period) {
  if (!period || typeof period !== 'string') {
    return null;
  }

  const parts = period.split(' - ').map(part => part.trim());
  if (parts.length !== 2) {
    console.warn(`Invalid period format: ${period}`);
    return null;
  }

  const [startPart, endPart] = parts;
  const isCurrent = endPart.toLowerCase() === 'present' || endPart.toLowerCase() === 'ongoing';

  // Parse start date
  const startMatch = startPart.match(/^([a-zA-Z]+)\s+(\d{4})$/);
  if (!startMatch) {
    console.warn(`Invalid start date format: ${startPart}`);
    return null;
  }

  const startMonth = monthMap[startMatch[1].toLowerCase()];
  const startYear = parseInt(startMatch[2]);

  if (!startMonth || !startYear) {
    console.warn(`Could not parse start date: ${startPart}`);
    return null;
  }

  // Parse end date (if not current)
  let endMonth = null;
  let endYear = null;

  if (!isCurrent) {
    const endMatch = endPart.match(/^([a-zA-Z]+)\s+(\d{4})$/);
    if (endMatch) {
      endMonth = monthMap[endMatch[1].toLowerCase()];
      endYear = parseInt(endMatch[2]);
    }
  }

  return {
    startMonth,
    startYear,
    endMonth,
    endYear,
    isCurrent,
  };
}

/**
 * Convert education entry from legacy to structured format
 * @param {Object} educationEntry - Legacy education entry
 * @returns {Object} Structured education entry
 */
function convertEducationEntry(educationEntry) {
  if (typeof educationEntry === 'string') {
    return {
      university: educationEntry,
      major: null,
      field: null,
      campus: null,
      startMonth: 1,
      startYear: new Date().getFullYear(),
      endMonth: null,
      endYear: null,
      isCurrent: true,
      GPA: null,
    };
  }

  const structured = parsePeriodToStructured(educationEntry.period);
  if (!structured) {
    // Fallback to current date if parsing fails
    const now = new Date();
    structured = {
      startMonth: now.getMonth() + 1,
      startYear: now.getFullYear(),
      endMonth: null,
      endYear: null,
      isCurrent: true,
    };
  }

  return {
    university: educationEntry.university || 'Unknown University',
    major: educationEntry.major || null,
    field: educationEntry.field || null,
    campus: educationEntry.campus || null,
    startMonth: structured.startMonth,
    startYear: structured.startYear,
    endMonth: structured.endMonth,
    endYear: structured.endYear,
    isCurrent: structured.isCurrent,
    GPA: educationEntry.GPA || null,
  };
}

/**
 * Convert experience entry from legacy to structured format
 * @param {Object} experienceEntry - Legacy experience entry
 * @returns {Object} Structured experience entry
 */
function convertExperienceEntry(experienceEntry) {
  if (typeof experienceEntry === 'string') {
    return {
      company: experienceEntry,
      position: 'Unknown Position',
      description: null,
      startMonth: 1,
      startYear: new Date().getFullYear(),
      endMonth: null,
      endYear: null,
      isCurrent: true,
      positionLevel: null,
    };
  }

  const structured = parsePeriodToStructured(experienceEntry.period);
  if (!structured) {
    // Fallback to current date if parsing fails
    const now = new Date();
    structured = {
      startMonth: now.getMonth() + 1,
      startYear: now.getFullYear(),
      endMonth: null,
      endYear: null,
      isCurrent: true,
    };
  }

  return {
    company: experienceEntry.company || 'Unknown Company',
    position: experienceEntry.position || 'Unknown Position',
    description: experienceEntry.description || null,
    startMonth: structured.startMonth,
    startYear: structured.startYear,
    endMonth: structured.endMonth,
    endYear: structured.endYear,
    isCurrent: structured.isCurrent,
    positionLevel: experienceEntry.postition_level || experienceEntry.positionLevel || null,
  };
}

/**
 * Main migration function
 */
async function migratePeriodToStructured() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting migration from period strings to structured date fields...');
    
    // Get all candidates with parsedData
    const result = await client.query(`
      SELECT id, "parsedData", "educationData", "experienceData"
      FROM "Candidate"
      WHERE "parsedData" IS NOT NULL
    `);

    console.log(`📊 Found ${result.rows.length} candidates to migrate`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const candidate of result.rows) {
      try {
        const parsedData = candidate.parsedData;
        let hasChanges = false;
        let newEducationData = candidate.educationData || [];
        let newExperienceData = candidate.experienceData || [];

        // Migrate education data
        if (parsedData.candidate_info?.education && Array.isArray(parsedData.candidate_info.education)) {
          newEducationData = parsedData.candidate_info.education.map(convertEducationEntry);
          hasChanges = true;
          console.log(`  📚 Migrated ${newEducationData.length} education entries for candidate ${candidate.id}`);
        }

        // Migrate experience data
        if (parsedData.candidate_info?.experience && Array.isArray(parsedData.candidate_info.experience)) {
          newExperienceData = parsedData.candidate_info.experience.map(convertExperienceEntry);
          hasChanges = true;
          console.log(`  💼 Migrated ${newExperienceData.length} experience entries for candidate ${candidate.id}`);
        }

        // Update database if changes were made
        if (hasChanges) {
          await client.query(`
            UPDATE "Candidate"
            SET "educationData" = $1, "experienceData" = $2, "updatedAt" = NOW()
            WHERE id = $3
          `, [JSON.stringify(newEducationData), JSON.stringify(newExperienceData), candidate.id]);
          
          migratedCount++;
        }

      } catch (error) {
        console.error(`❌ Error migrating candidate ${candidate.id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n✅ Migration completed!');
    console.log(`📈 Successfully migrated: ${migratedCount} candidates`);
    console.log(`❌ Errors: ${errorCount} candidates`);
    
    if (errorCount > 0) {
      console.log('\n⚠️  Some candidates failed to migrate. Check the logs above for details.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  migratePeriodToStructured()
    .then(() => {
      console.log('🎉 Migration script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migratePeriodToStructured, parsePeriodToStructured }; 