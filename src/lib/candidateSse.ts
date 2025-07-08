// src/lib/candidateSse.ts
const controllers = new Set<ReadableStreamDefaultController<any>>();

export function addSseController(controller: ReadableStreamDefaultController<any>) {
  controllers.add(controller);
}

export function removeSseController(controller: ReadableStreamDefaultController<any>) {
  controllers.delete(controller);
}

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