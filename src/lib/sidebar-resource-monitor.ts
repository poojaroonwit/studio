/**
 * Sidebar Resource Monitor
 * 
 * This utility provides specific monitoring and cleanup for sidebar-related resources
 * to prevent memory leaks and performance issues.
 */

interface SidebarResourceStats {
  eventListeners: number;
  timeouts: number;
  intervals: number;
  eventSources: number;
  domNodes: number;
  memoryUsage: number;
}

class SidebarResourceMonitor {
  private static instance: SidebarResourceMonitor;
  private resourceCounts: Map<string, number> = new Map();
  private cleanupFunctions: Set<() => void> = new Set();
  private isMonitoring = false;

  private constructor() {
    this.initializeMonitoring();
  }

  static getInstance(): SidebarResourceMonitor {
    if (!SidebarResourceMonitor.instance) {
      SidebarResourceMonitor.instance = new SidebarResourceMonitor();
    }
    return SidebarResourceMonitor.instance;
  }

  private initializeMonitoring() {
    if (typeof window === 'undefined') return;

    // Monitor DOM changes in sidebar
    this.observeSidebarDOM();
    
    // Monitor memory usage
    this.startMemoryMonitoring();
    
    // Auto-cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanupAll();
    });

    window.addEventListener('pagehide', () => {
      this.cleanupAll();
    });
  }

  private observeSidebarDOM() {
    if (typeof window === 'undefined') return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check for potential memory leaks in sidebar
          this.checkForOrphanedElements(mutation.target as Element);
        }
      });
    });

    // Observe sidebar container
    const sidebarContainer = document.querySelector('[data-sidebar="sidebar"]');
    if (sidebarContainer) {
      observer.observe(sidebarContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }

    this.addCleanupFunction(() => {
      observer.disconnect();
    });
  }

  private checkForOrphanedElements(element: Element) {
    // Check for elements that might be leaking
    const orphanedElements = element.querySelectorAll('[data-orphaned="true"]');
    if (orphanedElements.length > 0) {
      console.warn('🚨 Found orphaned elements in sidebar:', orphanedElements.length);
      orphanedElements.forEach(el => el.remove());
    }
  }

  private startMemoryMonitoring() {
    if (typeof window === 'undefined') return;

    const checkMemory = () => {
      if ((performance as any).memory) {
        const memoryInfo = (performance as any).memory;
        const usedMemory = Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024);
        
        if (usedMemory > 200) {
          console.warn(`🚨 High memory usage detected: ${usedMemory}MB`);
          this.suggestCleanup();
        }
      }
    };

    const intervalId = setInterval(checkMemory, 30000); // Check every 30 seconds
    
    this.addCleanupFunction(() => {
      clearInterval(intervalId);
    });
  }

  private suggestCleanup() {
    console.log('💡 Suggested cleanup actions:');
    console.log('1. Check for unmounted components with active event listeners');
    console.log('2. Clear any remaining timeouts or intervals');
    console.log('3. Close any open EventSource connections');
    console.log('4. Remove any orphaned DOM elements');
  }

  registerResource(type: string, id: string | number) {
    const key = `${type}:${id}`;
    this.resourceCounts.set(key, (this.resourceCounts.get(key) || 0) + 1);
  }

  unregisterResource(type: string, id: string | number) {
    const key = `${type}:${id}`;
    this.resourceCounts.delete(key);
  }

  addCleanupFunction(cleanup: () => void) {
    this.cleanupFunctions.add(cleanup);
  }

  removeCleanupFunction(cleanup: () => void) {
    this.cleanupFunctions.delete(cleanup);
  }

  getStats(): SidebarResourceStats {
    const stats: SidebarResourceStats = {
      eventListeners: 0,
      timeouts: 0,
      intervals: 0,
      eventSources: 0,
      domNodes: 0,
      memoryUsage: 0
    };

    // Count resources by type
    this.resourceCounts.forEach((count, key) => {
      const type = key.split(':')[0];
      switch (type) {
        case 'eventListener':
          stats.eventListeners += count;
          break;
        case 'timeout':
          stats.timeouts += count;
          break;
        case 'interval':
          stats.intervals += count;
          break;
        case 'eventSource':
          stats.eventSources += count;
          break;
      }
    });

    // Count DOM nodes in sidebar
    if (typeof window !== 'undefined') {
      const sidebar = document.querySelector('[data-sidebar="sidebar"]');
      if (sidebar) {
        stats.domNodes = sidebar.querySelectorAll('*').length;
      }
    }

    // Get memory usage
    if (typeof window !== 'undefined' && (performance as any).memory) {
      const memoryInfo = (performance as any).memory;
      stats.memoryUsage = Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024);
    }

    return stats;
  }

  cleanupAll() {
    console.log('🧹 Cleaning up sidebar resources...');
    
    this.cleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    });

    this.cleanupFunctions.clear();
    this.resourceCounts.clear();
    
    console.log('✅ Sidebar resources cleaned up');
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🔍 Sidebar resource monitoring started');
  }

  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    console.log('⏹️ Sidebar resource monitoring stopped');
  }
}

// Export singleton instance
export const sidebarResourceMonitor = SidebarResourceMonitor.getInstance();

// Export utility functions
export function monitorSidebarResource(type: string, id: string | number) {
  sidebarResourceMonitor.registerResource(type, id);
}

export function unmonitorSidebarResource(type: string, id: string | number) {
  sidebarResourceMonitor.unregisterResource(type, id);
}

export function getSidebarResourceStats(): SidebarResourceStats {
  return sidebarResourceMonitor.getStats();
}

export function cleanupSidebarResources() {
  sidebarResourceMonitor.cleanupAll();
}
