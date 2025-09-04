'use client';

import React, { useState, useEffect } from 'react';

interface ConnectionInfo {
  url: string;
  state: any;
  eventSourceReadyState: number;
  eventSourceReadyStateText: string;
  connectionAge: number;
}

export default function RobustSSETest() {
  const [sseManager, setSseManager] = useState<any>(null);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [debugMode, setDebugMode] = useState(true);

  useEffect(() => {
    // Minimal EventSource for debug
    const es = new EventSource('/api/sse');
    setSseManager(es);

    // Update connection info periodically
    const interval = setInterval(() => {
      setConnectionInfo(prev => prev || {
        url: '/api/sse',
        state: {},
        eventSourceReadyState: es.readyState,
        eventSourceReadyStateText: es.readyState === 0 ? 'CONNECTING' : es.readyState === 1 ? 'OPEN' : 'CLOSED',
        connectionAge: 0
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      es.close();
    };
  }, [debugMode]);

  const addMessage = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setMessages(prev => [...prev.slice(-9), {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const connect = () => {};

  const disconnect = () => { if (sseManager) sseManager.close(); };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'OPEN': return 'text-green-600';
      case 'CONNECTING': return 'text-yellow-600';
      case 'CLOSED': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getMessageColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Robust SSE Connection Test</h2>
      
      {/* Controls */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={connect}
            disabled={isConnected}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
          >
            Connect
          </button>
          <button
            onClick={disconnect}
            disabled={!isConnected}
            className="px-4 py-2 bg-red-600 text-white rounded disabled:bg-gray-400"
          >
            Disconnect
          </button>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={debugMode}
              onChange={(e) => setDebugMode(e.target.checked)}
            />
            Debug Mode
          </label>
        </div>
        
        <div className="text-sm text-gray-600">
          <p><strong>Status:</strong> {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
          <p><strong>URL:</strong> /api/sse</p>
        </div>
      </div>

      {/* Connection Info */}
      {connectionInfo && (
        <div className="mb-6 p-4 bg-white border rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Connection Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Ready State:</strong> 
                <span className={`ml-2 ${getStateColor(connectionInfo.eventSourceReadyStateText)}`}>
                  {connectionInfo.eventSourceReadyStateText} ({connectionInfo.eventSourceReadyState})
                </span>
              </p>
              <p><strong>Retry Count:</strong> {connectionInfo.state.retryCount}</p>
              <p><strong>Total Reconnects:</strong> {connectionInfo.state.totalReconnects}</p>
            </div>
            <div>
              <p><strong>Connection Age:</strong> {Math.round(connectionInfo.connectionAge / 1000)}s</p>
              <p><strong>Last Error:</strong> {connectionInfo.state.lastError || 'None'}</p>
              <p><strong>Last Error Time:</strong> {connectionInfo.state.lastErrorTime ? new Date(connectionInfo.state.lastErrorTime).toLocaleTimeString() : 'None'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="p-4 bg-white border rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Connection Messages</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-500">No messages yet...</p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-2 rounded text-sm ${getMessageColor(msg.type)}`}
              >
                <span className="text-xs text-gray-500">[{msg.timestamp}]</span> {msg.message}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Raw State Debug */}
      {debugMode && connectionInfo && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Raw State Debug</h3>
          <pre className="text-xs overflow-x-auto">
            {JSON.stringify(connectionInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
