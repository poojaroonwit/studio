"use client";
import { useState } from "react";

export default function ApiKeyManager() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchApiKey = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users/me/api-key");
      const data = await res.json();
      if (res.ok) setApiKey(data.apiKey);
      else setError(data.error || "Failed to fetch API key");
    } catch (e) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users/me/api-key", { method: "POST" });
      const data = await res.json();
      if (res.ok) setApiKey(data.apiKey);
      else setError(data.error || "Failed to generate API key");
    } catch (e) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const revokeApiKey = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users/me/api-key", { method: "DELETE" });
      if (res.ok) setApiKey(null);
      else setError("Failed to revoke API key");
    } catch (e) {
      setError("Network error");
    } finally {
      setLoading(false);
      setShowRevokeConfirm(false);
    }
  };

  const handleCopy = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const status = apiKey ? "Active" : "Not Generated";
  const statusColor = apiKey ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600";

  return (
    <div className="max-w-lg mx-auto mt-12 p-6 bg-card dark:bg-card rounded shadow">
      <h1 className="text-2xl font-bold mb-2">API Key Management</h1>
      <div className="flex items-center mb-4">
        <span className={`px-2 py-1 rounded text-xs font-semibold mr-2 ${statusColor}`}>{status}</span>
        {apiKey && <span className="text-xs text-gray-500">(Keep this key secret)</span>}
      </div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={fetchApiKey}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring"
          disabled={loading}
        >
          View API Key
        </button>
        <button
          onClick={generateApiKey}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring"
          disabled={loading}
        >
          Generate New API Key
        </button>
        <button
          onClick={() => setShowRevokeConfirm(true)}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring"
          disabled={loading || !apiKey}
        >
          Revoke API Key
        </button>
      </div>
      {loading && <div className="mb-2 text-blue-600">Loading...</div>}
      {error && <div className="mb-2 text-red-600">{error}</div>}
      {apiKey ? (
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={apiKey}
              readOnly
              className="w-full p-2 bg-gray-100 dark:bg-gray-800 rounded font-mono text-sm select-all border dark:border-gray-700"
              aria-label="API Key"
            />
            <button
              onClick={handleCopy}
              className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none"
              aria-label="Copy API Key"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-1">Never share your API key. It provides access to your account via the API.</div>
        </div>
      ) : (
        <div className="mb-4 text-sm text-gray-500">No API key generated yet.</div>
      )}
      {/* Usage Instructions */}
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded border dark:border-gray-700">
        <div className="font-semibold mb-1">How to use your API Key:</div>
        <div className="text-xs text-gray-700 dark:text-gray-300">
          Include the following header in your API requests:<br />
          <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">Authorization: Bearer &lt;your-api-key&gt;</span>
        </div>
      </div>
      {/* Confirmation Dialog */}
      {showRevokeConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
          <div className="bg-card dark:bg-gray-900 p-6 rounded shadow-lg max-w-sm w-full">
            <h2 className="text-lg font-bold mb-2">Revoke API Key?</h2>
            <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">This action cannot be undone. Any scripts or integrations using this key will stop working immediately.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRevokeConfirm(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={revokeApiKey}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 