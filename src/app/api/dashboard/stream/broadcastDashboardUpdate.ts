// In-memory list of connected clients (for demo; use a better store in production)
const clients: any[] = [];

export function broadcastDashboardUpdate(data: any) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.write(new TextEncoder().encode(payload));
  }
}

export { clients }; 
