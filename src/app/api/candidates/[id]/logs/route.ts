import { NextRequest } from 'next/server';

// TODO: Replace with real DB query
const mockLogs = [
  {
    id: 'log1',
    action: 'Updated candidate information',
    user: 'Admin User',
    time: '2024-06-01T10:00:00Z',
    note: 'Changed phone number.'
  },
  {
    id: 'log2',
    action: 'Stage changed',
    user: 'Recruiter Jane',
    time: '2024-06-02T14:30:00Z',
    note: 'Moved to Interview stage.'
  },
  {
    id: 'log3',
    action: 'Added comment',
    user: 'Recruiter Jane',
    time: '2024-06-02T15:00:00Z',
    note: 'Candidate responded to email.'
  }
];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // In a real implementation, query the AuditLog table for entity = 'candidate' and entity_id = params.id
  // For now, return mock data
  return new Response(JSON.stringify({ data: mockLogs }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
} 