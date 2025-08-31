export default function DocsPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Documentation</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-3">API Documentation</h2>
          <p className="text-muted-foreground mb-4">
            Interactive API documentation with Swagger UI for testing endpoints.
          </p>
          <a 
            href="/api-docs/ui" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            View API Documentation
          </a>
        </div>
        
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Settings API Docs</h2>
          <p className="text-muted-foreground mb-4">
            API documentation accessible from the settings panel.
          </p>
          <a 
            href="/settings/api-docs" 
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            View Settings API Docs
          </a>
        </div>
      </div>
    </div>
  );
}
