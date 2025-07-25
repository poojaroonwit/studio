import fetch from 'node-fetch';

async function testFitScoreSorting() {
  console.log('🧪 Testing fit score sorting in candidates API...');
  
  const baseUrl = 'http://localhost:8021/api/candidates';
  
  try {
    // Test ascending sort
    console.log('\n📊 Testing ascending fit score sort...');
    const ascResponse = await fetch(`${baseUrl}?sortColumn=fitScore&sortDirection=asc&limit=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (ascResponse.ok) {
      const ascData = await ascResponse.json();
      console.log(`📊 Ascending response status: ${ascResponse.status}`);
      
      if (ascData.data && Array.isArray(ascData.data)) {
        console.log(`📊 Number of candidates returned: ${ascData.data.length}`);
        
        // Check if fit scores are in ascending order
        const fitScores = ascData.data.map(c => c.fitScore).filter(score => typeof score === 'number');
        console.log(`📊 Fit scores (ascending):`, fitScores);
        
        // Verify ascending order
        const isAscending = fitScores.every((score, index) => {
          if (index === 0) return true;
          return score >= fitScores[index - 1];
        });
        
        console.log(`✅ Ascending sort correct: ${isAscending}`);
      }
    } else {
      console.log(`❌ Ascending sort failed: ${ascResponse.status}`);
    }

    // Test descending sort
    console.log('\n📊 Testing descending fit score sort...');
    const descResponse = await fetch(`${baseUrl}?sortColumn=fitScore&sortDirection=desc&limit=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (descResponse.ok) {
      const descData = await descResponse.json();
      console.log(`📊 Descending response status: ${descResponse.status}`);
      
      if (descData.data && Array.isArray(descData.data)) {
        console.log(`📊 Number of candidates returned: ${descData.data.length}`);
        
        // Check if fit scores are in descending order
        const fitScores = descData.data.map(c => c.fitScore).filter(score => typeof score === 'number');
        console.log(`📊 Fit scores (descending):`, fitScores);
        
        // Verify descending order
        const isDescending = fitScores.every((score, index) => {
          if (index === 0) return true;
          return score <= fitScores[index - 1];
        });
        
        console.log(`✅ Descending sort correct: ${isDescending}`);
      }
    } else {
      console.log(`❌ Descending sort failed: ${descResponse.status}`);
    }

    // Test default sort (should be lastUpdate desc)
    console.log('\n📊 Testing default sort (lastUpdate desc)...');
    const defaultResponse = await fetch(`${baseUrl}?limit=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (defaultResponse.ok) {
      const defaultData = await defaultResponse.json();
      console.log(`📊 Default response status: ${defaultResponse.status}`);
      
      if (defaultData.data && Array.isArray(defaultData.data)) {
        console.log(`📊 Number of candidates returned: ${defaultData.data.length}`);
        
        // Show first few candidates with their fit scores
        const candidatesWithScores = defaultData.data.slice(0, 5).map(c => ({
          name: c.name,
          fitScore: c.fitScore,
          updatedAt: c.updatedAt
        }));
        console.log(`📊 First 5 candidates:`, candidatesWithScores);
      }
    } else {
      console.log(`❌ Default sort failed: ${defaultResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Error testing fit score sorting:', error.message);
  }
}

testFitScoreSorting(); 