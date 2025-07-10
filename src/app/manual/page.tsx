"use client";
import { useEffect, useState } from "react";
import { Loader2, FileText } from "lucide-react";

export default function ManualPage() {
  const [manualLink, setManualLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to get manualLink from window.__systemSettings
    if (typeof window !== "undefined" && window.__systemSettings) {
      setManualLink(window.__systemSettings.manualLink || null);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!manualLink) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <FileText className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Manual Not Configured</h2>
        <p className="text-muted-foreground mb-4 max-w-md">No manual link is set in system settings. Please contact your administrator.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-64px)] flex flex-col">
      <iframe
        src={manualLink}
        title="Manual"
        className="flex-1 w-full border-0 rounded-md shadow"
        style={{ minHeight: "80vh" }}
        allowFullScreen
      />
    </div>
  );
} 