import React from 'react';

// Mock candidate data with job matches
const mockCandidate = {
  id: '8ce5efc6-1728-41d2-a058-9b1026d7fabe',
  name: 'John Doe',
  email: 'john.doe@example.com',
  status: 'Applied',
  jobMatches: [
    {
      id: '1',
      jobId: 'pos-1',
      jobTitle: 'Software Engineer',
      fitScore: 85,
      matchReasons: ['Strong technical skills', 'Relevant experience', 'Good cultural fit'],
      positionTitle: 'Software Engineer'
    },
    {
      id: '2', 
      jobId: 'pos-2',
      jobTitle: 'Frontend Developer',
      fitScore: 78,
      matchReasons: ['React experience', 'UI/UX skills'],
      positionTitle: 'Frontend Developer'
    }
  ]
};

// Test the job matches display logic
function TestJobMatchesDisplay() {
  const candidateJobMatches = mockCandidate.jobMatches || [];
  
  console.log('Candidate job matches:', candidateJobMatches);
  console.log('Number of job matches:', candidateJobMatches.length);
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Job Matches Test</h2>
      <p><strong>Candidate:</strong> {mockCandidate.name}</p>
      <p><strong>Total Job Matches:</strong> {candidateJobMatches.length}</p>
      
      {candidateJobMatches.length > 0 ? (
        <div>
          <h3>Job Matches Found:</h3>
          {candidateJobMatches.map((match, index) => (
            <div key={match.id} style={{ 
              border: '1px solid #ccc', 
              margin: '10px 0', 
              padding: '15px',
              borderRadius: '5px'
            }}>
              <h4>{match.positionTitle || match.jobTitle || 'Unknown Position'}</h4>
              <p><strong>Fit Score:</strong> {match.fitScore}%</p>
              {match.matchReasons && match.matchReasons.length > 0 && (
                <div>
                  <p><strong>Match Reasons:</strong></p>
                  <ul>
                    {match.matchReasons.map((reason, reasonIndex) => (
                      <li key={reasonIndex}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: 'red' }}>No job matches found</p>
      )}
    </div>
  );
}

// Run the test
console.log('=== Job Matches Frontend Test ===');
const testResult = TestJobMatchesDisplay();
console.log('Test component rendered successfully');

export default TestJobMatchesDisplay; 