"use client";

import { useEffect, useState } from 'react';
import { UserTeamsTab } from '@/components/settings/UserTeamsTab';
import { readJsonObject } from '@/lib/response-json';

export default function UserTeamsPage() {
  const [showLogoOnly, setShowLogoOnly] = useState(false);

  useEffect(() => {
    const fetchShowLogoOnly = async () => {
      try {
        const response = await fetch('/api/settings/system-settings');
        if (response.ok) {
          const data = await readJsonObject(response);
          setShowLogoOnly(data.showLogoOnly === 'true' || data.showLogoOnly === true);
        }
      } catch (error) {
        console.error('Error fetching showLogoOnly setting:', error);
      }
    };

    fetchShowLogoOnly();
  }, []);

  return (
    <div className="h-full flex flex-col p-6">
      <UserTeamsTab hideTitle={showLogoOnly} />
    </div>
  );
}
