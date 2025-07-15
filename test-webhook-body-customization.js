const { WebhookBodyProcessor } = require('./src/lib/webhookBodyProcessor');

// Test the webhook body processor
async function testWebhookBodyProcessor() {
  console.log('Testing Webhook Body Processor...\n');

  // Test 1: Get available fields
  console.log('1. Testing available fields:');
  const candidateFields = WebhookBodyProcessor.getAvailableFields('candidate.created');
  console.log('Candidate created fields:', candidateFields);
  console.log('');

  // Test 2: Get sample payload
  console.log('2. Testing sample payload:');
  const samplePayload = WebhookBodyProcessor.getSamplePayload('candidate.created');
  console.log('Sample candidate payload:', JSON.stringify(samplePayload, null, 2));
  console.log('');

  // Test 3: Validate template
  console.log('3. Testing template validation:');
  const validTemplate = '{\n  "event": "{{event}}",\n  "data": {{data}}\n}';
  const invalidTemplate = '{\n  "event": "{{event}}",\n  "data": {{data}\n}'; // Missing closing brace
  
  const validResult = WebhookBodyProcessor.validateTemplate(validTemplate);
  const invalidResult = WebhookBodyProcessor.validateTemplate(invalidTemplate);
  
  console.log('Valid template result:', validResult);
  console.log('Invalid template result:', invalidResult);
  console.log('');

  // Test 4: Test field mappings
  console.log('4. Testing field mappings:');
  const testData = {
    candidate: {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
      status: 'active'
    }
  };

  const fieldMappings = [
    {
      source_field: 'candidate.name',
      target_field: 'full_name',
      transform: 'uppercase'
    },
    {
      source_field: 'candidate.email',
      target_field: 'contact_email'
    },
    {
      source_field: 'candidate.status',
      target_field: 'is_active',
      transform: 'boolean'
    }
  ];

  // This would require the database connection, so we'll just show the structure
  console.log('Field mappings:', fieldMappings);
  console.log('Test data:', JSON.stringify(testData, null, 2));
  console.log('');

  console.log('Webhook Body Processor tests completed!');
}

// Test the API endpoints (if server is running)
async function testAPIEndpoints() {
  console.log('Testing API Endpoints...\n');

  const baseUrl = 'http://localhost:3000';

  try {
    // Test 1: Get available fields
    console.log('1. Testing /api/settings/webhooks/available-fields');
    const fieldsResponse = await fetch(`${baseUrl}/api/settings/webhooks/available-fields`);
    if (fieldsResponse.ok) {
      const fieldsData = await fieldsResponse.json();
      console.log('Available fields response:', JSON.stringify(fieldsData, null, 2));
    } else {
      console.log('Failed to get available fields:', fieldsResponse.status);
    }
    console.log('');

    // Test 2: Validate template
    console.log('2. Testing /api/settings/webhooks/validate-template');
    const templateResponse = await fetch(`${baseUrl}/api/settings/webhooks/validate-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: '{\n  "event": "{{event}}",\n  "data": {{data}}\n}',
        event_type: 'candidate.created'
      })
    });
    
    if (templateResponse.ok) {
      const templateData = await templateResponse.json();
      console.log('Template validation response:', JSON.stringify(templateData, null, 2));
    } else {
      console.log('Failed to validate template:', templateResponse.status);
    }
    console.log('');

  } catch (error) {
    console.log('API tests failed (server may not be running):', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('=== Webhook Body Customization Tests ===\n');
  
  await testWebhookBodyProcessor();
  console.log('\n' + '='.repeat(50) + '\n');
  await testAPIEndpoints();
  
  console.log('\n=== Tests Completed ===');
}

// Run the tests
runTests().catch(console.error); 