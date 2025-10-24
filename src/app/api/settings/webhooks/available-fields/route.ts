export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { WebhookBodyProcessor } from '@/lib/webhookBodyProcessor';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const eventType = searchParams.get('event_type');

    if (eventType) {
      // Get fields for specific event type
      const fields = WebhookBodyProcessor.getAvailableFields(eventType);
      const samplePayload = WebhookBodyProcessor.getSamplePayload(eventType);
      
      return NextResponse.json({
        event_type: eventType,
        available_fields: fields,
        sample_payload: samplePayload
      });
    } else {
      // Get all available event types and their fields
      const allEventTypes = [
        'candidate.created', 'candidate.updated', 'candidate.deleted', 'candidate.stage_changed',
        'position.created', 'position.updated', 'position.deleted',
        'user.created', 'user.updated', 'user.deleted',
        'resume.uploaded', 'resume.processed',
        'comment.created', 'comment.updated', 'comment.deleted',
        'upload_queue.created', 'upload_queue.processing', 'upload_queue.completed', 
        'upload_queue.failed', 'upload_queue.retry'
      ];

      const eventFields = allEventTypes.map(eventType => ({
        event_type: eventType,
        available_fields: WebhookBodyProcessor.getAvailableFields(eventType),
        sample_payload: WebhookBodyProcessor.getSamplePayload(eventType)
      }));

      return NextResponse.json({
        event_types: eventFields
      });
    }
  } catch (error) {
    console.error('Error fetching available fields:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
