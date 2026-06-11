export function ApiDocsErrorPanel({ error }: { error: string }) {
  return (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-red-800 mb-2">API Documentation Error</h2>
        <p className="text-red-700">Failed to load API documentation: {error}</p>
        <p className="text-red-600 text-sm mt-2">Please try refreshing the page or contact support if the issue persists.</p>
      </div>
    </div>
  );
}

export function ApiDocsLoadingPanel() {
  return (
    <div className="p-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">Loading API Documentation...</h2>
        <p className="text-blue-700">Please wait while we load the API documentation.</p>
      </div>
    </div>
  );
}
