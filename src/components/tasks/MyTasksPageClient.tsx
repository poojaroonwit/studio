// src/components/tasks/MyTasksPageClient.tsx
"use client";

import useSWR from 'swr';
import { useState } from 'react';

interface MyTasksPageClientProps {
  userSession: { id: string; role: string; name: string | null } | null;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function MyTasksPageClient({ userSession }: MyTasksPageClientProps) {
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;
  const recruiterId = userSession?.role === 'Admin' ? undefined : userSession?.id;
  const query = new URLSearchParams({
    ...(recruiterId ? { assignedRecruiterId: recruiterId } : {}),
    ...(filter ? { name: filter } : {}),
    page: String(page),
    limit: String(limit),
  }).toString();
  const { data, error, isLoading } = useSWR(`/api/candidates?${query}`, fetcher);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">My Tasks</h1>
      <div className="mb-4 flex gap-2 items-center">
        <input
          className="border rounded px-2 py-1"
          placeholder="Search candidates by name..."
          value={filter}
          onChange={e => { setFilter(e.target.value); setPage(1); }}
        />
      </div>
      {isLoading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 animate-pulse rounded" />
          ))}
        </div>
      )}
      {error && (
        <div className="text-red-600">Failed to load candidates.</div>
      )}
      {data && data.data && data.data.length === 0 && !isLoading && (
        <div className="text-gray-500">No candidates found.</div>
      )}
      {data && data.data && data.data.length > 0 && (
        <ul className="divide-y border rounded bg-white">
          {data.data.map((candidate: any) => (
            <li key={candidate.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="font-semibold">{candidate.name}</span>
              <span className="text-sm text-gray-500">{candidate.email}</span>
              <span className="text-sm text-gray-400 ml-auto">{candidate.status}</span>
            </li>
          ))}
        </ul>
      )}
      {data && data.pagination && data.pagination.totalPages > 1 && (
        <div className="flex gap-2 mt-4 justify-center">
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </button>
          <span>Page {page} of {data.pagination.totalPages}</span>
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            onClick={() => setPage(page + 1)}
            disabled={page >= data.pagination.totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
