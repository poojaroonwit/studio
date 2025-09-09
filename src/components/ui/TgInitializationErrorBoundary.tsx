"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './button';
import { AlertTriangle, RefreshCw, Trash2, Wifi } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

export class TgInitializationErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Check if this is specifically a variable initialization error
    const isInitializationError = error.message.includes('Cannot access') && 
                                 error.message.includes('before initialization') &&
                                 (error.message.includes('tg') || 
                                  error.message.includes('activeCandidateTab') ||
                                  error.message.includes('ee') ||
                                  error.message.includes('tt') ||
                                  error.message.includes('nn'));
    
    if (isInitializationError) {
      return { hasError: true, error };
    }
    
    // Let other errors bubble up to parent error boundaries
    return { hasError: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const isInitializationError = error.message.includes('Cannot access') && 
                                 error.message.includes('before initialization') &&
                                 (error.message.includes('tg') || 
                                  error.message.includes('activeCandidateTab') ||
                                  error.message.includes('ee') ||
                                  error.message.includes('tt') ||
                                  error.message.includes('nn'));
    
    if (isInitializationError) {
      console.error('Variable Initialization Error caught:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount
      });
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleClearCache = async () => {
    try {
      // Clear all possible caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear IndexedDB
      if ('indexedDB' in window) {
        try {
          const databases = await indexedDB.databases();
          await Promise.all(
            databases.map(db => {
              if (db.name) {
                return new Promise((resolve, reject) => {
                  const deleteReq = indexedDB.deleteDatabase(db.name);
                  deleteReq.onsuccess = () => resolve(undefined);
                  deleteReq.onerror = () => reject(deleteReq.error);
                });
              }
            })
          );
        } catch (e) {
          console.warn('Could not clear IndexedDB:', e);
        }
      }
      
      // Reload after clearing
      window.location.reload();
    } catch (error) {
      console.error('Error clearing cache:', error);
      // Fallback to simple reload
      window.location.reload();
    }
  };

  private handleHardRefresh = () => {
    // Force a hard refresh that bypasses cache
    window.location.href = window.location.href + '?t=' + Date.now();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const isInitializationError = this.state.error.message.includes('Cannot access') && 
                                   this.state.error.message.includes('before initialization') &&
                                   (this.state.error.message.includes('tg') || 
                                    this.state.error.message.includes('activeCandidateTab') ||
                                    this.state.error.message.includes('ee') ||
                                    this.state.error.message.includes('tt') ||
                                    this.state.error.message.includes('nn'));

      if (!isInitializationError) {
        // Not an initialization error, let it bubble up
        throw this.state.error;
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            
            <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Initialization Error
            </h1>
            
            <p className="text-gray-600 text-center mb-6">
              A JavaScript initialization error has occurred. This is usually caused by cached files or browser compatibility issues.
            </p>

            <div className="space-y-3">
              {this.state.retryCount < this.maxRetries && (
                <Button
                  onClick={this.handleRetry}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                </Button>
              )}
              
              <Button
                onClick={this.handleRefresh}
                className="w-full"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
              
              <Button
                onClick={this.handleClearCache}
                className="w-full"
                variant="outline"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Cache & Reload
              </Button>
              
              <Button
                onClick={this.handleHardRefresh}
                className="w-full"
                variant="outline"
              >
                <Wifi className="w-4 h-4 mr-2" />
                Hard Refresh (Bypass Cache)
              </Button>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Error Details:</h3>
              <p className="text-xs text-gray-600 font-mono break-all">
                {this.state.error.message}
              </p>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                If this problem persists, try using a different browser or incognito mode.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
