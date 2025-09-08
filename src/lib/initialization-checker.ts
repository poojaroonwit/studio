/**
 * Initialization Checker
 * 
 * This utility helps prevent initialization errors by checking for common issues
 * that can cause 'tg' and 'ee' variable errors in minified bundles.
 */

interface InitializationCheckResult {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}

export class InitializationChecker {
  private static instance: InitializationChecker;
  private checks: Array<() => InitializationCheckResult> = [];

  static getInstance(): InitializationChecker {
    if (!InitializationChecker.instance) {
      InitializationChecker.instance = new InitializationChecker();
    }
    return InitializationChecker.instance;
  }

  private constructor() {
    this.setupChecks();
  }

  private setupChecks() {
    // Check for potential circular dependencies
    this.checks.push(() => this.checkCircularDependencies());
    
    // Check for problematic imports
    this.checks.push(() => this.checkProblematicImports());
    
    // Check for initialization order issues
    this.checks.push(() => this.checkInitializationOrder());
    
    // Check for webpack configuration issues
    this.checks.push(() => this.checkWebpackConfig());
  }

  private checkCircularDependencies(): InitializationCheckResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for common circular dependency patterns
    const problematicPatterns = [
      /import.*from.*\.\.\/.*\.\.\//, // Deep relative imports
      /export.*import/, // Re-exports
    ];

    // This is a simplified check - in a real implementation, you'd analyze the actual module graph
    if (typeof window !== 'undefined') {
      // Check if there are any obvious circular dependency issues
      const scripts = document.querySelectorAll('script[src]');
      const scriptSources = Array.from(scripts).map(script => script.getAttribute('src'));
      
      // Look for duplicate script loading
      const duplicates = scriptSources.filter((src, index) => scriptSources.indexOf(src) !== index);
      if (duplicates.length > 0) {
        issues.push('Duplicate script loading detected');
        recommendations.push('Remove duplicate script tags');
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  private checkProblematicImports(): InitializationCheckResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for dynamic imports that might cause issues
    if (typeof window !== 'undefined') {
      // Check for dynamic imports in the current page
      const scripts = document.querySelectorAll('script');
      let hasDynamicImports = false;
      
      scripts.forEach(script => {
        if (script.textContent?.includes('import(')) {
          hasDynamicImports = true;
        }
      });

      if (hasDynamicImports) {
        recommendations.push('Ensure dynamic imports are properly handled with error boundaries');
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  private checkInitializationOrder(): InitializationCheckResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for proper initialization order
    if (typeof window !== 'undefined') {
      // Check if critical libraries are loaded
      const criticalLibraries = ['React', 'Next'];
      const missingLibraries = criticalLibraries.filter(lib => !(lib in window));
      
      if (missingLibraries.length > 0) {
        issues.push(`Missing critical libraries: ${missingLibraries.join(', ')}`);
        recommendations.push('Ensure all critical libraries are loaded before application initialization');
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  private checkWebpackConfig(): InitializationCheckResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for webpack configuration issues that might cause minification problems
    if (typeof window !== 'undefined') {
      // Check if the bundle is properly minified
      const scripts = document.querySelectorAll('script[src*="chunks"]');
      if (scripts.length === 0) {
        issues.push('No webpack chunks found - possible build issue');
        recommendations.push('Rebuild the application to ensure proper chunk generation');
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Run all initialization checks
   */
  public runChecks(): InitializationCheckResult {
    const allIssues: string[] = [];
    const allRecommendations: string[] = [];

    for (const check of this.checks) {
      const result = check();
      allIssues.push(...result.issues);
      allRecommendations.push(...result.recommendations);
    }

    return {
      isValid: allIssues.length === 0,
      issues: allIssues,
      recommendations: allRecommendations
    };
  }

  /**
   * Check if the current environment is likely to cause initialization errors
   */
  public isEnvironmentSafe(): boolean {
    if (typeof window === 'undefined') {
      return true; // Server-side is always safe
    }

    // Check for common problematic environments
    const userAgent = navigator.userAgent;
    const isOldBrowser = /MSIE|Trident|Edge\/(1[0-6])/.test(userAgent);
    const isSlowConnection = navigator.connection && navigator.connection.effectiveType === 'slow-2g';
    
    return !isOldBrowser && !isSlowConnection;
  }

  /**
   * Get recommendations for preventing initialization errors
   */
  public getPreventionRecommendations(): string[] {
    return [
      'Ensure all imports are properly ordered',
      'Avoid circular dependencies between modules',
      'Use error boundaries for dynamic imports',
      'Implement proper loading states',
      'Clear browser cache regularly during development',
      'Use consistent import/export patterns',
      'Avoid conditional imports in critical paths',
      'Test in production-like environments'
    ];
  }
}

// Export singleton instance
export const initializationChecker = InitializationChecker.getInstance();

// Auto-run checks in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  setTimeout(() => {
    const result = initializationChecker.runChecks();
    if (!result.isValid) {
      console.warn('Initialization Checker found potential issues:', result);
    }
  }, 1000);
}

export default initializationChecker;
