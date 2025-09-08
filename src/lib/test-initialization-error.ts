/**
 * Test Initialization Error
 * 
 * This utility helps test the initialization error handling system.
 * Use this in development to verify that error recovery works properly.
 */

export class InitializationErrorTester {
  /**
   * Simulate a 'tg' variable initialization error
   */
  static simulateTgError(): void {
    if (typeof window === 'undefined') {
      console.warn('Cannot simulate client-side errors on server');
      return;
    }

    console.log('🧪 Simulating TG initialization error...');
    
    // Create a fake error that mimics the real 'tg' error
    const fakeError = new Error("Cannot access 'tg' before initialization");
    fakeError.name = 'ReferenceError';
    
    // Dispatch the error to trigger our error handling
    window.dispatchEvent(new ErrorEvent('error', {
      message: fakeError.message,
      error: fakeError,
      filename: 'test-initialization-error.ts',
      lineno: 1,
      colno: 1
    }));
  }

  /**
   * Simulate an 'ee' variable initialization error
   */
  static simulateEeError(): void {
    if (typeof window === 'undefined') {
      console.warn('Cannot simulate client-side errors on server');
      return;
    }

    console.log('🧪 Simulating EE initialization error...');
    
    // Create a fake error that mimics the real 'ee' error
    const fakeError = new Error("Cannot access 'ee' before initialization");
    fakeError.name = 'ReferenceError';
    
    // Dispatch the error to trigger our error handling
    window.dispatchEvent(new ErrorEvent('error', {
      message: fakeError.message,
      error: fakeError,
      filename: 'test-initialization-error.ts',
      lineno: 1,
      colno: 1
    }));
  }

  /**
   * Simulate a generic initialization error
   */
  static simulateGenericInitializationError(): void {
    if (typeof window === 'undefined') {
      console.warn('Cannot simulate client-side errors on server');
      return;
    }

    console.log('🧪 Simulating generic initialization error...');
    
    // Create a fake error that mimics a generic initialization error
    const fakeError = new Error("Cannot access 'variable' before initialization");
    fakeError.name = 'ReferenceError';
    
    // Dispatch the error to trigger our error handling
    window.dispatchEvent(new ErrorEvent('error', {
      message: fakeError.message,
      error: fakeError,
      filename: 'test-initialization-error.ts',
      lineno: 1,
      colno: 1
    }));
  }

  /**
   * Test the error recovery system
   */
  static testErrorRecovery(): void {
    if (typeof window === 'undefined') {
      console.warn('Cannot test client-side error recovery on server');
      return;
    }

    console.log('🧪 Testing error recovery system...');
    
    // Test all types of initialization errors
    setTimeout(() => this.simulateTgError(), 100);
    setTimeout(() => this.simulateEeError(), 200);
    setTimeout(() => this.simulateGenericInitializationError(), 300);
    
    console.log('✅ Error recovery test completed. Check the console for error handling logs.');
  }

  /**
   * Test cache clearing functionality
   */
  static async testCacheClearing(): Promise<void> {
    if (typeof window === 'undefined') {
      console.warn('Cannot test cache clearing on server');
      return;
    }

    console.log('🧪 Testing cache clearing functionality...');
    
    try {
      const { CacheClearHelper } = await import('./cache-clear-helper');
      await CacheClearHelper.clearAll({
        clearLocalStorage: true,
        clearSessionStorage: true,
        clearCacheStorage: true
      });
      console.log('✅ Cache clearing test completed successfully');
    } catch (error) {
      console.error('❌ Cache clearing test failed:', error);
    }
  }

  /**
   * Run all tests
   */
  static async runAllTests(): Promise<void> {
    console.log('🧪 Running all initialization error tests...');
    
    this.testErrorRecovery();
    await this.testCacheClearing();
    
    console.log('✅ All tests completed. Check the console for results.');
  }
}

// Make it available globally in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).InitializationErrorTester = InitializationErrorTester;
  console.log('🧪 InitializationErrorTester available globally. Use window.InitializationErrorTester.runAllTests() to test.');
}

export default InitializationErrorTester;
