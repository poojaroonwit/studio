"use client";

import { DashboardPageClient } from '@/components/dashboard/DashboardPageClient';
import { useEffect, useRef } from 'react';
import './dashboard.css';

export default function DashboardPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add scroll event listener for enhanced scrollbar behavior
    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const scrollPercentage = (scrollTop / (scrollHeight - clientHeight)) * 100;

      // Update scroll progress indicator
      const progressIndicator = document.querySelector('.scroll-progress-indicator') as HTMLElement;
      if (progressIndicator) {
        progressIndicator.style.height = `${scrollPercentage}%`;
      }

      // Show/hide scroll buttons based on position
      const topBtn = document.querySelector('.scroll-to-top') as HTMLElement;
      const bottomBtn = document.querySelector('.scroll-to-bottom') as HTMLElement;
      
      if (topBtn) {
        topBtn.style.opacity = scrollTop > 100 ? '1' : '0.5';
      }
      
      if (bottomBtn) {
        bottomBtn.style.opacity = scrollPercentage < 95 ? '1' : '0.5';
      }
    };

    container.addEventListener('scroll', handleScroll);
    
    // Initial call
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ 
        top: 0, 
        behavior: 'smooth' 
      });
    }
  };

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ 
        top: containerRef.current.scrollHeight, 
        behavior: 'smooth' 
      });
    }
  };

  return (
    <div className="dashboard-container" ref={containerRef}>
      <div className="dashboard-content">
        <DashboardPageClient />
      </div>
      
      {/* Scroll Progress Indicator */}
      <div className="scroll-progress-indicator"></div>
      
      {/* Enhanced Scroll Navigation Buttons */}
      <div className="scroll-nav-buttons">
        <button 
          className="scroll-btn scroll-to-top"
          onClick={scrollToTop}
          title="Scroll to Top"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m18 15-6-6-6 6"/>
          </svg>
        </button>
        
        <button 
          className="scroll-btn scroll-to-bottom"
          onClick={scrollToBottom}
          title="Scroll to Bottom"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
