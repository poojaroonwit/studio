"use client";

import React from "react";
import { SystemPreferencesForm } from "@/components/settings/SystemPreferencesForm";

export default function SystemPreferencesPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">System Preferences</h1>
        <p className="text-muted-foreground">
          Configure application settings and appearance
        </p>
      </div>

      <SystemPreferencesForm 
        onSave={() => {
          console.log('Settings saved');
        }}
        onCancel={() => {
          console.log('Settings cancelled');
        }}
      />
    </div>
  );
}
