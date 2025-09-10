// Test script for new SLA calculation logic
// This script demonstrates the new SLA calculation behavior

const { checkSLAViolationForHeadcount, getHiredDateForHeadcount } = require('./src/lib/slaUtils.ts');

// Mock headcount data for testing
const mockVacantHeadcount = {
  id: 'test-vacant-1',
  positionId: 'pos-1',
  status: 'vacant',
  candidateId: null,
  requestDate: new Date('2024-01-01'), // 30 days ago
  position: {
    grade: {
      name: 'G3',
      slaDays: 30
    }
  }
};

const mockFilledHeadcount = {
  id: 'test-filled-1',
  positionId: 'pos-2',
  status: 'filled',
  candidateId: 'candidate-1',
  requestDate: new Date('2024-01-01'), // 30 days ago
  position: {
    grade: {
      name: 'G3',
      slaDays: 30
    }
  }
};

async function testSLALogic() {
  console.log('Testing new SLA calculation logic...\n');
  
  // Test vacant headcount (should use now - request_date)
  console.log('1. Testing vacant headcount:');
  console.log('   Request Date:', mockVacantHeadcount.requestDate.toISOString());
  console.log('   Status: vacant');
  console.log('   Expected: Calculate (now - request_date) vs SLA days');
  
  try {
    const vacantResult = await checkSLAViolationForHeadcount(mockVacantHeadcount);
    console.log('   Result:', vacantResult);
    console.log('   Calculation Type:', vacantResult?.calculationType);
    console.log('   Days Elapsed:', vacantResult?.daysElapsed);
    console.log('   Is Violated:', vacantResult?.isViolated);
  } catch (error) {
    console.log('   Error:', error.message);
  }
  
  console.log('\n2. Testing filled headcount:');
  console.log('   Request Date:', mockFilledHeadcount.requestDate.toISOString());
  console.log('   Status: filled');
  console.log('   Expected: Calculate (hired_date - request_date) vs SLA days');
  
  try {
    const filledResult = await checkSLAViolationForHeadcount(mockFilledHeadcount);
    console.log('   Result:', filledResult);
    console.log('   Calculation Type:', filledResult?.calculationType);
    console.log('   Days Elapsed:', filledResult?.daysElapsed);
    console.log('   Is Violated:', filledResult?.isViolated);
  } catch (error) {
    console.log('   Error:', error.message);
  }
  
  console.log('\nTest completed!');
}

// Run the test
testSLALogic().catch(console.error);
