const XLSX = require('xlsx');

function testXlsx() {
  try {
    console.log('Testing XLSX library...');
    
    // Create a simple workbook
    const workbook = XLSX.utils.book_new();
    
    // Create sample data
    const data = [
      { 'ID': '1', 'Name': 'Test Candidate', 'Email': 'test@example.com' },
      { 'ID': '2', 'Name': 'Another Candidate', 'Email': 'another@example.com' }
    ];
    
    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 10 }, // ID
      { wch: 20 }, // Name
      { wch: 25 }  // Email
    ];
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Export');
    
    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    console.log('✅ XLSX library working correctly');
    console.log('Buffer size:', excelBuffer.length, 'bytes');
    console.log('Buffer type:', typeof excelBuffer);
    
    // Test if it's a valid buffer
    if (Buffer.isBuffer(excelBuffer)) {
      console.log('✅ Valid buffer created');
    } else {
      console.log('❌ Invalid buffer type');
    }
    
  } catch (error) {
    console.error('❌ XLSX test failed:', error.message);
    console.error('Error details:', error);
  }
}

testXlsx();
