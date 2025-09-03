/**
 * Initialization Guard Utility
 * 
 * This utility helps prevent initialization errors and provides debugging information
 * for common issues like the 'ee' variable error.
 */

import { useRef, useState, useEffect, useCallback } from 'react';

export interface InitializationState {
  isReady: boolean;
  isInitialized: boolean;
  hasError: boolean;
  error?: Error;
  initializationTime?: number;
  dependencies: string[];
}
