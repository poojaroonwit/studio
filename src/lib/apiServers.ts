// src/lib/apiServers.ts
export function getApiServers() {
  const url = process.env.NEXTAUTH_URL || 'http://app:8021';
  return [
    {
      url,
      description: url,
    },
  ];
} 