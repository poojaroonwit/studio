"use client";

import React, { useState, useEffect } from 'react';

export function ZoomDebug() {
  const [debugInfo, setDebugInfo] = useState({
    zoom: '0',
    bodyHeight: '0',
    bodyMinHeight: '0',
    htmlHeight: '0',
    windowHeight: '0',
    documentHeight: '0'
  });

  useEffect(() => {
    const updateDebugInfo = () => {
      setDebugInfo({
        zoom: document.documentElement.style.zoom || '1',
        bodyHeight: document.body.style.height || 'auto',
        bodyMinHeight: document.body.style.minHeight || 'auto',
        htmlHeight: document.documentElement.style.height || 'auto',
        windowHeight: window.innerHeight.toString(),
        documentHeight: document.documentElement.scrollHeight.toString()
      });
    };

    updateDebugInfo();
    
    const interval = setInterval(updateDebugInfo, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 left-4 bg-black/90 text-white p-3 rounded-lg text-sm font-mono z-50 border border-white/20 shadow-lg">
      <div className="font-bold text-yellow-400 mb-2">ZOOM DEBUG</div>
      <div>Zoom: <span className="text-green-400">{debugInfo.zoom}</span></div>
      <div>Body H: <span className="text-blue-400">{debugInfo.bodyHeight}</span></div>
      <div>Body MinH: <span className="text-blue-400">{debugInfo.bodyMinHeight}</span></div>
      <div>HTML H: <span className="text-purple-400">{debugInfo.htmlHeight}</span></div>
      <div>Window H: <span className="text-orange-400">{debugInfo.windowHeight}</span></div>
      <div>Doc H: <span className="text-red-400">{debugInfo.documentHeight}</span></div>
    </div>
  );
}
