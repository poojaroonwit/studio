'use client'

import { useEffect } from 'react'
import { isChunkLoadError, recoverFromChunkLoadError } from '@/lib/chunk-load-recovery'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console
    console.error('Error boundary caught error', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    })

    if (isChunkLoadError(error)) {
      recoverFromChunkLoadError(error).catch((recoveryError) => {
        console.error('Chunk load recovery failed:', recoveryError)
      })
    }
  }, [error])

  return (
    <div className="flex min-items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Something went wrong!
        </h2>
        <p className="text-gray-600 mb-6">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={() => {
            if (isChunkLoadError(error)) {
              recoverFromChunkLoadError(error).catch(() => window.location.reload())
              return
            }

            reset()
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
