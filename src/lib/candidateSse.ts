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

export function broadcastCandidateCommentUpdate(payload: { candidateId: string, comment: any, action: string }) {
  const data = `event: comment\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const controller of controllers) {
    try {
      controller.enqueue(data);
    } catch (e) {}
  }
}

export function broadcastCandidateResumeUpdate(payload: { candidateId: string, resume: any, action: string }) {
  const data = `event: resume\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const controller of controllers) {
    try {
      controller.enqueue(data);
    } catch (e) {}
  }
}

export function broadcastCandidateTransitionUpdate(payload: { candidateId: string, transition: any, action: string }) {
  const data = `event: transition\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const controller of controllers) {
    try {
      controller.enqueue(data);
    } catch (e) {}
  }
}

export function broadcastCandidateAttachmentUpdate(payload: { candidateId: string, attachment: any, action: string }) {
  const data = `event: attachment\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const controller of controllers) {
    try {
      controller.enqueue(data);
    } catch (e) {}
  }
} 