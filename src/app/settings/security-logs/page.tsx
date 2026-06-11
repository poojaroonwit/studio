'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Image from 'next/image';
import { getJsonArray, isJsonObject, readJsonObject } from '@/lib/response-json';

interface LogEntry {
    id: string;
    action: string;
    details: {
        url: string;
        userAgent: string;
        timestamp: string;
    };
    createdAt: string;
    user: {
        name: string;
        email: string;
        image: string | null;
    };
}

function normalizeSecurityLogs(value: unknown): LogEntry[] {
    if (!isJsonObject(value)) {
        return [];
    }

    return (getJsonArray(value, 'logs') ?? [])
        .filter(isJsonObject)
        .map((log) => log as unknown as LogEntry);
}

export default function SecurityLogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLogs() {
            try {
                const res = await fetch('/api/protection/logs');
                if (res.ok) {
                    setLogs(normalizeSecurityLogs(await readJsonObject(res)));
                }
            } catch (error) {
                console.error('Failed to fetch logs', error);
            } finally {
                setLoading(false);
            }
        }
        fetchLogs();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading security logs...</div>;
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Security Logs</h1>
            <p className="text-gray-600 mb-8">
                Monitoring suspicious activities such as screen capture attempts.
            </p>

            <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page URL</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device Info</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                    No security incidents recorded.
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-8 w-8 relative">
                                                {log.user.image ? (
                                                    <Image
                                                        src={log.user.image}
                                                        alt={log.user.name}
                                                        fill
                                                        className="rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                        {log.user.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{log.user.name}</div>
                                                <div className="text-sm text-gray-500">{log.user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                            {log.action.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900 truncate max-w-xs" title={log.details.url}>
                                            {log.details.url}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs text-gray-500 truncate max-w-xs" title={log.details.userAgent}>
                                            {log.details.userAgent}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {format(new Date(log.createdAt), 'PPP p')}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
