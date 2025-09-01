"use client";

import { useEffect } from 'react';
import { setupGlobalResizeObserverErrorHandler } from '@/lib/resize-observer-utils';

export function ResizeObserverInitializer() {
	useEffect(() => {
		// Initialize global ResizeObserver error handler on the client
		const cleanup = setupGlobalResizeObserverErrorHandler();
		return () => {
			// Call cleanup if provided
			if (typeof cleanup === 'function') {
				cleanup();
			}
		};
	}, []);

	// This component renders nothing
	return null;
}


