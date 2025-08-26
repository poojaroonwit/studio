"use client";

import { useState, useEffect } from 'react';
import { CandidateAvatarCompact } from '@/components/ui/candidate-avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TestCandidate {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export default function TestAvatarPage() {
  const [candidates, setCandidates] = useState<TestCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/candidates?limit=10');
      if (!response.ok) {
        throw new Error('Failed to fetch candidates');
      }
      const data = await response.json();
      setCandidates(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Testing Candidate Avatars</h1>
        <p>Loading candidates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Testing Candidate Avatars</h1>
        <p className="text-red-500">Error: {error}</p>
        <Button onClick={fetchCandidates} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Testing Candidate Avatars</h1>
      
      <div className="mb-6">
        <Button onClick={fetchCandidates}>Refresh Candidates</Button>
        <p className="text-sm text-muted-foreground mt-2">
          Found {candidates.length} candidates
        </p>
      </div>

      <div className="grid gap-4">
        {candidates.map((candidate) => (
          <Card key={candidate.id}>
            <CardHeader>
              <CardTitle className="text-lg">Candidate: {candidate.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Avatar Component:</p>
                  <CandidateAvatarCompact
                    user={{
                      id: candidate.id,
                      name: candidate.name,
                      avatarUrl: candidate.avatarUrl,
                      email: candidate.email
                    }}
                    size="lg"
                  />
                </div>
                
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    <strong>ID:</strong> {candidate.id}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Email:</strong> {candidate.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Avatar URL:</strong> {candidate.avatarUrl || 'None'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {candidates.length === 0 && (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              No candidates found. Make sure you have candidates in your database.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
