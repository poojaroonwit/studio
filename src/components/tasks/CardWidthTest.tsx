"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CardWidthTestProps {
  cardWidth: 'narrow' | 'medium' | 'wide' | 'custom';
  customCardWidth?: number;
}

export function CardWidthTest({ cardWidth, customCardWidth }: CardWidthTestProps) {
  const getCardWidth = () => {
    switch (cardWidth) {
      case 'narrow':
        return { className: 'w-52', style: {} }; // 208px
      case 'medium':
        return { className: 'w-64', style: {} }; // 256px
      case 'wide':
        return { className: 'w-80', style: {} }; // 320px
      case 'custom':
        const width = customCardWidth || 256;
        return { 
          className: 'flex-shrink-0 flex-grow-0', 
          style: { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }
        };
      default:
        return { className: 'w-64', style: {} };
    }
  };

  const widthInfo = getCardWidth();
  const actualWidth = cardWidth === 'custom' ? customCardWidth || 256 : 
    cardWidth === 'narrow' ? 208 : 
    cardWidth === 'medium' ? 256 : 320;

  return (
    <div className="space-y-4">
      <div className="text-sm">
        <strong>Card Width:</strong> {cardWidth} ({actualWidth}px)
      </div>
      
      <div 
        className={`${widthInfo.className} border-2 border-blue-500 bg-blue-50 h-20 flex items-center justify-center`}
        style={widthInfo.style}
      >
        <div className="text-center">
          <div className="text-sm font-medium">Test Card</div>
          <div className="text-xs text-gray-600">{actualWidth}px</div>
        </div>
      </div>
      
      <div className="text-xs text-gray-500">
        Class: {widthInfo.className}<br/>
        Style: {JSON.stringify(widthInfo.style)}
      </div>
    </div>
  );
}
