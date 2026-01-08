"use client";

import { useState, useEffect } from 'react';

export type DrawerStyle = 'classic' | 'modern';

const DEFAULT_DRAWER_STYLE: DrawerStyle = 'classic';
const DRAWER_STYLE_KEY = 'drawerStyle';

export function useDrawerStyle(): DrawerStyle {
  const [drawerStyle, setDrawerStyle] = useState<DrawerStyle>(DEFAULT_DRAWER_STYLE);

  useEffect(() => {
    const fetchDrawerStyle = async () => {
      try {
        const response = await fetch('/api/settings/system-settings');
        if (!response.ok) return;
        
        const data = await response.json();
        let settings: any = {};
        if (data.settings && Array.isArray(data.settings)) {
          settings = Object.fromEntries(data.settings.map((setting: any) => [setting.key, setting.value]));
        } else {
          settings = data;
        }
        
        const style = (settings[DRAWER_STYLE_KEY] as DrawerStyle) || DEFAULT_DRAWER_STYLE;
        setDrawerStyle(style);
      } catch (error) {
        console.error('Error fetching drawer style:', error);
      }
    };

    fetchDrawerStyle();
  }, []);

  return drawerStyle;
}

