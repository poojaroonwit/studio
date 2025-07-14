// src/lib/candidateSse.ts
const controllers = new Set<ReadableStreamDefaultController<any>>();

// Cleanup stale controllers periodically
setInterval(() => {
  const initialCount = controllers.size;
  for (const controller of controllers) {
    try {
      // Try to send a keepalive to test if the connection is still alive
      controller.enqueue(new TextEncoder().encode(': keepalive\n\n'));
    } catch (e) {
      // Remove the controller if it's causing errors
      controllers.delete(controller);
    }
  }
}, 60000); // Check every minute

export function addSseController(controller: ReadableStreamDefaultController<any>) {
  controllers.add(controller);
}

export function removeSseController(controller: ReadableStreamDefaultController<any>) {
  controllers.delete(controller);
}

export function broadcastCandidateUpdate(candidate: any) {
  const data = `data: ${JSON.stringify(candidate)}\n\n`;
  const encodedData = new TextEncoder().encode(data);
  
  for (const controller of controllers) {
    try {
      controller.enqueue(encodedData);
    } catch (e) {
      console.error('[SSE] Error broadcasting candidate update:', e);
      // Remove the controller if it's causing errors
      controllers.delete(controller);
    }
  }
}

export function broadcastCandidateCommentUpdate(payload: { candidateId: string, comment: any, action: string }) {
  const data = `event: comment\ndata: ${JSON.stringify(payload)}\n\n`;
  const encodedData = new TextEncoder().encode(data);
  
  for (const controller of controllers) {
    try {
      controller.enqueue(encodedData);
    } catch (e) {
      console.error('[SSE] Error broadcasting comment update:', e);
      controllers.delete(controller);
    }
  }
}

export function broadcastCandidateResumeUpdate(payload: { candidateId: string, resume: any, action: string }) {
  const data = `event: resume\ndata: ${JSON.stringify(payload)}\n\n`;
  const encodedData = new TextEncoder().encode(data);
  
  for (const controller of controllers) {
    try {
      controller.enqueue(encodedData);
    } catch (e) {
      console.error('[SSE] Error broadcasting resume update:', e);
      controllers.delete(controller);
    }
  }
}

export function broadcastCandidateTransitionUpdate(payload: { candidateId: string, transition: any, action: string }) {
  const data = `event: transition\ndata: ${JSON.stringify(payload)}\n\n`;
  const encodedData = new TextEncoder().encode(data);
  
  for (const controller of controllers) {
    try {
      controller.enqueue(encodedData);
    } catch (e) {
      console.error('[SSE] Error broadcasting transition update:', e);
      controllers.delete(controller);
    }
  }
}

export function broadcastCandidateAttachmentUpdate(payload: { candidateId: string, attachment: any, action: string }) {
  const data = `event: attachment\ndata: ${JSON.stringify(payload)}\n\n`;
  const encodedData = new TextEncoder().encode(data);
  
  for (const controller of controllers) {
    try {
      controller.enqueue(encodedData);
    } catch (e) {
      console.error('[SSE] Error broadcasting attachment update:', e);
      controllers.delete(controller);
    }
  }
}

export function broadcastRecruitmentStagesUpdate(stages: any[]) {
  const data = `event: recruitment-stages\ndata: ${JSON.stringify(stages)}\n\n`;
  const encodedData = new TextEncoder().encode(data);
  
  for (const controller of controllers) {
    try {
      controller.enqueue(encodedData);
    } catch (e) {
      console.error('[SSE] Error broadcasting recruitment stages update:', e);
      // Remove the controller if it's causing errors
      controllers.delete(controller);
    }
  }
} 