'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Code, Copy, ExternalLink, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const WEBHOOK_EVENT_CATEGORIES = [
  {
    category: 'Candidate Events',
    events: [
      { id: 'candidate.created', label: 'Candidate Created', description: 'Triggered when a candidate is created.' },
      { id: 'candidate.updated', label: 'Candidate Updated', description: 'Triggered when a candidate is updated.' },
      { id: 'candidate.deleted', label: 'Candidate Deleted', description: 'Triggered when a candidate is deleted.' },
      { id: 'candidate.stage_changed', label: 'Stage Changed', description: 'Triggered when a candidate changes stage.' },
    ],
  },
  {
    category: 'Position Events',
    events: [
      { id: 'position.created', label: 'Position Created', description: 'Triggered when a position is created.' },
      { id: 'position.updated', label: 'Position Updated', description: 'Triggered when a position is updated.' },
      { id: 'position.deleted', label: 'Position Deleted', description: 'Triggered when a position is deleted.' },
    ],
  },
  {
    category: 'User Events',
    events: [
      { id: 'user.created', label: 'User Created', description: 'Triggered when a user is created.' },
      { id: 'user.updated', label: 'User Updated', description: 'Triggered when a user is updated.' },
      { id: 'user.deleted', label: 'User Deleted', description: 'Triggered when a user is deleted.' },
    ],
  },
  {
    category: 'Resume Events',
    events: [
      { id: 'resume.uploaded', label: 'Resume Uploaded', description: 'Triggered when a resume is uploaded.' },
      { id: 'resume.processed', label: 'Resume Processed', description: 'Triggered when a resume is processed.' },
    ],
  },
  {
    category: 'Comment Events',
    events: [
      { id: 'comment.created', label: 'Comment Created', description: 'Triggered when a comment is created.' },
      { id: 'comment.updated', label: 'Comment Updated', description: 'Triggered when a comment is updated.' },
      { id: 'comment.deleted', label: 'Comment Deleted', description: 'Triggered when a comment is deleted.' },
    ],
  },
  {
    category: 'Upload Queue Events',
    events: [
      { id: 'upload_queue.created', label: 'Upload Queue Created', description: 'Triggered when an upload queue item is created.' },
      { id: 'upload_queue.processing', label: 'Upload Queue Processing', description: 'Triggered when an upload queue item is processing.' },
      { id: 'upload_queue.completed', label: 'Upload Queue Completed', description: 'Triggered when an upload queue item is completed.' },
      { id: 'upload_queue.failed', label: 'Upload Queue Failed', description: 'Triggered when an upload queue item fails.' },
      { id: 'upload_queue.retry', label: 'Upload Queue Retry', description: 'Triggered when an upload queue item is retried.' },
    ],
  },
];

const PAYLOAD_EXAMPLES = {
  'candidate.created': {
    event: 'candidate.created',
    timestamp: '2024-01-15T10:30:00.000Z',
    data: {
      candidate: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Doe',
        email: 'john.doe@example.com',
        status: 'Applied',
        position_id: '550e8400-e29b-41d4-a716-446655440001',
        application_date: '2024-01-15T10:30:00.000Z',
        created_at: '2024-01-15T10:30:00.000Z',
        updated_at: '2024-01-15T10:30:00.000Z'
      }
    }
  },
  'candidate.stage_changed': {
    event: 'candidate.stage_changed',
    timestamp: '2024-01-15T14:30:00.000Z',
    data: {
      candidate: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Doe',
        email: 'john.doe@example.com',
        status: 'Interview',
        position_id: '550e8400-e29b-41d4-a716-446655440001',
        application_date: '2024-01-15T10:30:00.000Z',
        created_at: '2024-01-15T10:30:00.000Z',
        updated_at: '2024-01-15T14:30:00.000Z'
      },
      stage_change: {
        old_stage: 'Applied',
        new_stage: 'Interview',
        changed_at: '2024-01-15T14:30:00.000Z'
      }
    }
  },
  'position.created': {
    event: 'position.created',
    timestamp: '2024-01-15T09:00:00.000Z',
    data: {
      position: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Senior Software Engineer',
        department: 'Engineering',
        description: 'We are looking for a senior software engineer...',
        is_open: true,
        created_at: '2024-01-15T09:00:00.000Z',
        updated_at: '2024-01-15T09:00:00.000Z'
      }
    }
  },
  'upload_queue.completed': {
    event: 'upload_queue.completed',
    timestamp: '2024-01-15T11:45:00.000Z',
    data: {
      upload_queue: {
        id: '550e8400-e29b-41d4-a716-446655440002',
        file_name: 'john_doe_resume.pdf',
        file_size: 1024000,
        status: 'completed',
        upload_date: '2024-01-15T11:30:00.000Z',
        completed_date: '2024-01-15T11:45:00.000Z',
        created_at: '2024-01-15T11:30:00.000Z'
      }
    }
  }
};

export default function WebhookDocsPage() {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Webhook Documentation</h1>
        <p className="text-muted-foreground">
          Learn how to integrate with our webhook system to receive real-time notifications.
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="payloads">Payload Examples</TabsTrigger>
          <TabsTrigger value="integration">Integration Guide</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                What are Webhooks?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Webhooks are HTTP callbacks that notify your application when specific events occur in our recruitment system. 
                Instead of polling our API for updates, webhooks push data to your endpoint in real-time.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-semibold">Real-time</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive instant notifications when events occur
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="font-semibold">Efficient</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No need to constantly poll our API for updates
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Code className="h-4 w-4 text-purple-500" />
                    <span className="font-semibold">Flexible</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Choose which events you want to receive
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How Webhooks Work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold">1. Configure Your Endpoint</h4>
                <p className="text-sm text-muted-foreground">
                  Set up a webhook endpoint in your application that can receive HTTP POST requests.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">2. Create a Webhook</h4>
                <p className="text-sm text-muted-foreground">
                  In the webhook management interface, create a new webhook with your endpoint URL and select the events you want to receive.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">3. Receive Notifications</h4>
                <p className="text-sm text-muted-foreground">
                  When events occur, we'll send HTTP requests to your endpoint with the event data.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">4. Process the Data</h4>
                <p className="text-sm text-muted-foreground">
                  Your application processes the webhook payload and takes appropriate action.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Events</CardTitle>
              <CardDescription>
                Choose from these events to configure your webhooks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {WEBHOOK_EVENT_CATEGORIES.map(({ category, events }) => (
                  <div key={category}>
                    <h3 className="text-lg font-semibold mb-3">{category}</h3>
                    <div className="grid gap-3">
                      {events.map((event) => (
                        <div key={event.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {event.id}
                                </Badge>
                                <span className="font-medium">{event.label}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {event.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payloads" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payload Examples</CardTitle>
              <CardDescription>
                See the structure of webhook payloads for different events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(PAYLOAD_EXAMPLES).map(([eventId, payload]) => (
                  <div key={eventId} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{eventId}</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(JSON.stringify(payload, null, 2))}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                      <code>{JSON.stringify(payload, null, 2)}</code>
                    </pre>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Integration Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">1. Set Up Your Endpoint</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Create an HTTP endpoint in your application that can receive POST requests.
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-mono">https://your-app.com/webhooks/recruitment</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">2. Handle Webhook Requests</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Your endpoint should handle the webhook payload and return a 2xx status code.
                </p>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{`// Example Node.js/Express endpoint
app.post('/webhooks/recruitment', (req, res) => {
  const { event, timestamp, data } = req.body;
  
  // Process the webhook data
  console.log('Received webhook:', event, data);
  
  // Return success
  res.status(200).json({ received: true });
});`}</code>
                </pre>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3. Test Your Integration</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Use the webhook test feature to verify your endpoint is working correctly.
                </p>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-blue-800">Tip</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Always test your webhook endpoint before going live. Use tools like ngrok for local development.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Best Practices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Authentication</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Use authentication to ensure webhooks are coming from our system.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Basic Authentication</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Bearer Token Authentication</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Custom Header Authentication</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">HTTPS Required</h4>
                <p className="text-sm text-muted-foreground">
                  All webhook endpoints must use HTTPS to ensure data security in transit.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Idempotency</h4>
                <p className="text-sm text-muted-foreground">
                  Design your webhook handlers to be idempotent. The same webhook might be sent multiple times due to retries.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Timeout Handling</h4>
                <p className="text-sm text-muted-foreground">
                  Process webhooks quickly and return a response within 30 seconds to avoid timeouts.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 