const connections = new Map<string, ReadableStreamDefaultController>();

// Broadcast function for other parts of the application
export function broadcastToUser(userId: string, eventType: string, data: any) {
  const controller = connections.get(userId);
  if (controller) {
    try {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch (error) {
      connections.delete(userId);
    }
  }
}

// Broadcast to all connected users
export function broadcastToAll(eventType: string, data: any) {
  const encoder = new TextEncoder();
  const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  
  for (const [userId, controller] of connections.entries()) {
    try {
      controller.enqueue(encoder.encode(message));
    } catch (error) {
      connections.delete(userId);
    }
  }
}

// Internal function to add a connection
export function addConnection(userId: string, controller: ReadableStreamDefaultController) {
  connections.set(userId, controller);
}

// Internal function to remove a connection
export function removeConnection(userId: string) {
  connections.delete(userId);
}
