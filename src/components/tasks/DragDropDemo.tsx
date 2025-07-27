"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HorizontalStageKanbanView } from '@/components/candidates/CandidateKanbanView';
import { toast } from 'react-hot-toast';

// Mock candidate data for testing
const mockCandidates = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    status: 'Applied',
    fitScore: 85,
    position: { title: 'Software Engineer' },
    avatarUrl: null,
    phone: '+1-555-0123',
    applicationDate: '2024-01-15',
    recruiterId: 'recruiter1',
    recruiter: { name: 'Alice Johnson' },
    parsedData: {},
    customAttributes: {}
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    status: 'Screening',
    fitScore: 92,
    position: { title: 'Product Manager' },
    avatarUrl: null,
    phone: '+1-555-0124',
    applicationDate: '2024-01-16',
    recruiterId: 'recruiter2',
    recruiter: { name: 'Bob Wilson' },
    parsedData: {},
    customAttributes: {}
  },
  {
    id: '3',
    name: 'Mike Johnson',
    email: 'mike.johnson@example.com',
    status: 'Interview Scheduled',
    fitScore: 78,
    position: { title: 'UX Designer' },
    avatarUrl: null,
    phone: '+1-555-0125',
    applicationDate: '2024-01-17',
    recruiterId: 'recruiter1',
    recruiter: { name: 'Alice Johnson' },
    parsedData: {},
    customAttributes: {}
  },
  {
    id: '4',
    name: 'Sarah Wilson',
    email: 'sarah.wilson@example.com',
    status: 'Interviewing',
    fitScore: 88,
    position: { title: 'Data Scientist' },
    avatarUrl: null,
    phone: '+1-555-0126',
    applicationDate: '2024-01-18',
    recruiterId: 'recruiter2',
    recruiter: { name: 'Bob Wilson' },
    parsedData: {},
    customAttributes: {}
  },
  {
    id: '5',
    name: 'David Brown',
    email: 'david.brown@example.com',
    status: 'Offer Sent',
    fitScore: 95,
    position: { title: 'DevOps Engineer' },
    avatarUrl: null,
    phone: '+1-555-0127',
    applicationDate: '2024-01-19',
    recruiterId: 'recruiter1',
    recruiter: { name: 'Alice Johnson' },
    parsedData: {},
    customAttributes: {}
  }
];

const mockStages = ['Applied', 'Screening', 'Interview Scheduled', 'Interviewing', 'Offer Sent', 'Offer Accepted', 'Hired', 'Rejected'];

export function DragDropDemo() {
  const [candidates, setCandidates] = useState(mockCandidates);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

  const handleMoveCandidate = (candidate: any, newStatus: string) => {
    setCandidates(prev => 
      prev.map(c => 
        c.id === candidate.id 
          ? { ...c, status: newStatus }
          : c
      )
    );
    
    toast.success(`Moved ${candidate.name} to ${newStatus} stage`);
  };

  const handleCardClick = (candidate: any) => {
    setSelectedCandidate(candidate);
  };

  const resetDemo = () => {
    setCandidates(mockCandidates);
    toast.success('Demo reset to initial state');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Task Board Drag & Drop Demo</h1>
          <p className="text-muted-foreground mt-1">
            Try dragging candidate cards between different stages to see the enhanced drag and drop functionality.
          </p>
        </div>
        <Button onClick={resetDemo} variant="outline">
          Reset Demo
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">✓</Badge>
              <span className="text-sm">Visual drag feedback</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">✓</Badge>
              <span className="text-sm">Drop zone indicators</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">✓</Badge>
              <span className="text-sm">Smooth animations</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">✓</Badge>
              <span className="text-sm">Real-time updates</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-muted-foreground">
              <p>1. Click and drag any candidate card</p>
              <p>2. Hover over different stages</p>
              <p>3. Drop to move the candidate</p>
              <p>4. Watch for visual feedback</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Candidates:</span>
              <Badge variant="outline">{candidates.length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Stages:</span>
              <Badge variant="outline">{mockStages.length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Avg Score:</span>
              <Badge variant="outline">
                {Math.round(candidates.reduce((sum, c) => sum + c.fitScore, 0) / candidates.length)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-lg">
        <HorizontalStageKanbanView
          candidates={candidates}
          statuses={mockStages}
          onMoveCandidate={handleMoveCandidate}
          onCardClick={handleCardClick}
          visibleFields={['name', 'email', 'status', 'fitScore']}
          visibleColumnValues={['Applied', 'Screening', 'Interview Scheduled', 'Interviewing', 'Offer Sent']}
        />
      </div>

      {selectedCandidate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Selected Candidate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Name:</strong> {selectedCandidate.name}</p>
              <p><strong>Email:</strong> {selectedCandidate.email}</p>
              <p><strong>Status:</strong> {selectedCandidate.status}</p>
              <p><strong>Fit Score:</strong> {selectedCandidate.fitScore}%</p>
              <p><strong>Position:</strong> {selectedCandidate.position?.title}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 