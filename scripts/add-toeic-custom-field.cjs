const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addToeicCustomField() {
  const client = await pool.connect();
  
  try {
    console.log('Adding TOEIC custom field definition...');
    
    // Check if TOEIC field already exists
    const existingField = await client.query(
      'SELECT id FROM "CustomFieldDefinition" WHERE model_name = $1 AND field_code = $2',
      ['Candidate', 'TOEIC_SCORE']
    );

    if (existingField.rows.length > 0) {
      console.log('TOEIC custom field already exists, skipping...');
      return;
    }

    // Insert TOEIC custom field definition
    const insertQuery = `
      INSERT INTO "CustomFieldDefinition" (
        id, model_name, field_key, field_code, label, field_type, options, 
        is_required, sort_order, attribute_code, attribute_label,
        view_roles, edit_roles, show_in_filter, show_in_candidate_detail,
        show_in_full_candidate_detail, show_in_task_board_filter,
        show_in_position_settings, show_in_headcount_detail, allow_custom_options,
        "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid(), 'Candidate', 'toeic_score', 'TOEIC_SCORE', 'TOEIC Score', 'number', 
        null, false, 10, 'TOEIC_SCORE', 'TOEIC English Proficiency Score',
        ARRAY[]::text[], ARRAY[]::text[], true, true, true, false, false, false,
        NOW(), NOW()
      )
      RETURNING *;
    `;

    const result = await client.query(insertQuery);
    console.log('✅ TOEIC custom field created successfully:', result.rows[0]);
    
    // Add some predefined TOEIC score options
    const fieldId = result.rows[0].id;
    
    const toeicOptions = [
      { value: '0-300', label: '0-300 (Beginner)', color: '#ef4444', sortOrder: 1 },
      { value: '301-450', label: '301-450 (Elementary)', color: '#f97316', sortOrder: 2 },
      { value: '451-600', label: '451-600 (Intermediate)', color: '#eab308', sortOrder: 3 },
      { value: '601-750', label: '601-750 (Upper Intermediate)', color: '#22c55e', sortOrder: 4 },
      { value: '751-900', label: '751-900 (Advanced)', color: '#3b82f6', sortOrder: 5 },
      { value: '901-990', label: '901-990 (Expert)', color: '#8b5cf6', sortOrder: 6 }
    ];

    for (const option of toeicOptions) {
      await client.query(`
        INSERT INTO "CustomFieldOption" (
          id, custom_field_definition_id, value, label, color, sort_order, is_active,
          "createdAt", "updatedAt"
        )
        VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, true, NOW(), NOW()
        )
      `, [fieldId, option.value, option.label, option.color, option.sortOrder]);
    }
    
    console.log('✅ TOEIC score options added successfully');
    
  } catch (error) {
    console.error('❌ Error adding TOEIC custom field:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await addToeicCustomField();
    console.log('🎉 TOEIC custom field setup completed successfully!');
  } catch (error) {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
