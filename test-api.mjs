import fetch from 'node-fetch';

const testAPI = async () => {
  const positionId = '812e49ec-f8cd-4c7c-b519-c0d4eac9f876';
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('Testing API endpoints for position:', positionId);
    
    // Test the candidates endpoint
    console.log('\n1. Testing /api/positions/{id}/candidates with type=applied');
    const appliedResponse = await fetch(`${baseUrl}/api/positions/${positionId}/candidates?type=applied&page=1&limit=20`);
    const appliedData = await appliedResponse.json();
    console.log('Status:', appliedResponse.status);
    console.log('Response:', JSON.stringify(appliedData, null, 2));
    
    console.log('\n2. Testing /api/positions/{id}/candidates with type=all');
    const allResponse = await fetch(`${baseUrl}/api/positions/${positionId}/candidates?type=all&page=1&limit=20`);
    const allData = await allResponse.json();
    console.log('Status:', allResponse.status);
    console.log('Response:', JSON.stringify(allData, null, 2));
    
    console.log('\n3. Testing /api/positions/{id}/job-matches');
    const matchesResponse = await fetch(`${baseUrl}/api/positions/${positionId}/job-matches?page=1&limit=20`);
    const matchesData = await matchesResponse.json();
    console.log('Status:', matchesResponse.status);
    console.log('Response:', JSON.stringify(matchesData, null, 2));
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testAPI();
