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
  if (initialCount !== controllers.size) {
    console.log(`[SSE] Cleaned up ${initialCount - controllers.size} stale controllers. Remaining: ${controllers.size}`);
  }
}, 60000); // Check every minute

export function addSseController(controller: ReadableStreamDefaultController<any>) {
  controllers.add(controller);
  console.log('[SSE] Controller added. Total controllers:', controllers.size);
}

export function removeSseController(controller: ReadableStreamDefaultController<any>) {
  controllers.delete(controller);
  console.log('[SSE] Controller removed. Total controllers:', controllers.size);
}

export function broadcastCandidateUpdate(candidate: any) {
  const data = `data: ${JSON.stringify(candidate)}\n\n`;
  const encodedData = new TextEncoder().encode(data);
  let successCount = 0;
  let errorCount = 0;
  
  for (const controller of controllers) {
    try {
      controller.enqueue(encodedData);
      successCount++;
    } catch (e) {
      errorCount++;
      console.error('[SSE] Error broadcasting candidate update:', e);
      // Remove the controller if it's causing errors
      controllers.delete(controller);
    }
  }
  
  if (successCount > 0 || errorCount > 0) {
    console.log(`[SSE] Candidate broadcast completed. Success: ${successCount}, Errors: ${errorCount}`);
  }
}

export function broadcastCandidateCommentUpdate(payload: { candidateId: string, comment: any, action: string }) {
  const data = `event: comment\ndata: ${JSON.stringify(payload)}\n\n`;
  const encodedData = new TextEncoder().encode(data);
  let successCount = 0;
  let errorCount = 0;
  
  for (const controller of controllers) {
    try {
      controller.enqueue(encodedData);
      successCount++;
    } catch (e) {
      errorCount++;
      console.error('[SSE] Error broadcasting comment update:', e);
      controllers.delete(controller);
    }
  }
  
  if (successCount > 0 || errorCount > 0) {
    console.log(`[SSE] Comment broadcast completed. Success: ${successCount}, Errors: ${errorCount}`);
  }
}

export function broadcastCandidateResumeUpdate(payload: { candidateId: string, resume: any, action: string }) {
  const data = `event: resume\ndata: ${JSON.stringify(payload)}\n\n`;
  const encodedData = new TextEncoder().encode(data);
  let successCount = 0;
  let errorCount = 0;
  
  for (const controller of controllers) {
    try {
      controller.enqueue(encodedData);
      successCount++;
    } catch (e) {
      errorCount++;
      console.error('[SSE] Error broadcasting resume update:', e);
      controllers.delete(controller);
    }
  }
  
  if (successCount > 0 || errorCount > 0) {
    console.log(`[SSE] Resume broadcast completed. Success: ${successCount}, Errors: ${errorCount}`);
  }
}

export function broadcastCandidateTransitionUpdate(payload: { candidateId: string, transition: any, action: string }) {
  const data = `event: transition\ndata: ${JSON.stringify(payload)}\n\n`;
  const encodedData = new TextEncoder().encode(data);
  let successCount = 0;
  let errorCount = 0;
  
  for (const controller of controllers) {
    try {
      controller.enqueue(encodedData);
      successCount++;
    } catch (e) {
      errorCount++;
      console.error('[SSE] Error broadcasting transition update:', e);
      controllers.delete(controller);
    }
  }
  
  if (successCount > 0 || errorCount > 0) {
    console.log(`[SSE] Transition broadcast completed. Success: ${successCount}, Errors: ${errorCount}`);
  }
}

export function broadcastCandidateAttachmentUpdate(payload: { candidateId: string, attachment: any, action: string }) {
  const data = `event: attachment\ndata: ${JSON.stringify(payload)}\n\n`;
  const encodedData = new TextEncoder().encode(data);
  let successCount = 0;
  let errorCount = 0;
  
  for (const controller of controllers) {
    try {
      controller.enqueue(encodedData);
      successCount++;
    } catch (e) {
      errorCount++;
      console.error('[SSE] Error broadcasting attachment update:', e);
      controllers.delete(controller);
    }
  }
  
  if (successCount > 0 || errorCount > 0) {
    console.log(`[SSE] Attachment broadcast completed. Success: ${successCount}, Errors: ${errorCount}`);
  }
}

export function broadcastRecruitmentStagesUpdate(stages: any[]) {
  console.log('[SSE] Broadcasting recruitment stages update:', stages.length, 'stages');
  console.log('[SSE] Stage names:', stages.map(s => s.name));
  console.log('[SSE] Total controllers:', controllers.size);
  
  const data = `event: recruitment-stages\ndata: ${JSON.stringify(stages)}\n\n`;
  const encodedData = new TextEncoder().encode(data);
  console.log('[SSE] Broadcasting data:', data);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const controller of controllers) {
    try {
      controller.enqueue(encodedData);
      successCount++;
      console.log('[SSE] Successfully sent to controller', successCount);
    } catch (e) {
      errorCount++;
      console.error('[SSE] Error broadcasting recruitment stages update:', e);
      // Remove the controller if it's causing errors
      controllers.delete(controller);
    }
  }
  
  console.log(`[SSE] Broadcast completed. Success: ${successCount}, Errors: ${errorCount}`);
} 