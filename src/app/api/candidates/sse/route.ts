// SSE endpoint for candidate updates using Web Streams API (Next.js App Router)

const controllers = new Set<ReadableStreamDefaultController<any>>();

export async function GET() {
  let thisController: ReadableStreamDefaultController<any>;
  const stream = new ReadableStream({
    start(controller) {
      thisController = controller;
      controllers.add(controller);
    },
    cancel() {
      controllers.delete(thisController);
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

// Call this function to broadcast candidate updates
export function broadcastCandidateUpdate(candidate: any) {
  const data = `data: ${JSON.stringify(candidate)}\n\n`;
  for (const controller of controllers) {
    try {
      controller.enqueue(data);
    } catch (e) {
      // Ignore errors (client may have disconnected)
    }
  }
} 