// src/app/api-docs/page.tsx
"use client";
import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });
// CSS will be loaded dynamically

type Server = { url: string; description?: string };

export default function ApiDocsPage() {
  const [servers, setServers] = useState<Server[]>([]);
  const [swaggerSpec, setSwaggerSpec] = useState(null);
  const [serverUrl, setServerUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch server list and OpenAPI spec
  useEffect(() => {
    // Load Swagger UI CSS dynamically
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css';
    document.head.appendChild(link);

    Promise.all([
      fetch("/api-docs/servers").then(res => res.json()),
      fetch("/api-docs").then(res => res.json())
    ])
      .then(([serverList, spec]) => {
        setServers(serverList);
        const defaultServer = serverList[0]?.url || spec.servers?.[0]?.url || window.location.origin;
        setServerUrl(defaultServer);
        setSwaggerSpec(spec);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load spec or servers");
        setLoading(false);
      });

    // Cleanup function to remove the CSS link
    return () => {
      const existingLink = document.querySelector('link[href*="swagger-ui.css"]');
      if (existingLink) {
        existingLink.remove();
      }
    };
  }, []);

  // Update the servers array in the spec when serverUrl changes
  const getPatchedSpec = () => {
    if (
      !swaggerSpec ||
      typeof swaggerSpec !== "object" ||
      Array.isArray(swaggerSpec)
    ) return null;
    return {
      ...(swaggerSpec as Record<string, any>),
      servers: [
        servers.find(s => s.url === serverUrl) || { url: serverUrl, description: "Custom server" },
        ...servers.filter(s => s.url !== serverUrl)
      ]
    };
  };

  if (loading) return <div className="p-4">Loading API documentation...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="h-full w-full bg-background p-0 overflow-auto">
      <div className="p-4 bg-white border-b flex items-center gap-2">
        <label htmlFor="server-url" className="font-medium mr-2">Server:</label>
        <select
          id="server-url"
          value={serverUrl}
          onChange={e => setServerUrl(e.target.value)}
          className="border rounded px-2 py-1 w-96 max-w-full"
        >
          {servers.map((server) => (
            <option key={server.url} value={server.url}>
              {server.description || server.url}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-500 ml-2">(Select the API server to test)</span>
      </div>
      <SwaggerUI
        spec={getPatchedSpec()}
        docExpansion="list"
        defaultModelsExpandDepth={-1}
        tryItOutEnabled={true}
        requestInterceptor={(request) => {
          // Add any request interceptors if needed
          return request;
        }}
        responseInterceptor={(response) => {
          // Add any response interceptors if needed
          return response;
        }}
      />
    </div>
  );
}
