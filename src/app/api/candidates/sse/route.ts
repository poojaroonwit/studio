import { addSseController, removeSseController } from '@/lib/candidateSse';

export async function GET() {
  let thisController: ReadableStreamDefaultController<any>;
  const stream = new ReadableStream({
    start(controller) {
      thisController = controller;
      addSseController(controller);
    },
    cancel() {
      removeSseController(thisController);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
} 