// src/lib/apiServers.ts
export function getApiServers() {
  const url = process.env.NEXTAUTH_URL || 'http://localhost:8021';
  return [
    {
      url,
      description: url,
    },
  ];
} 