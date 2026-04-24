'use client'

import { useState, useSyncExternalStore } from 'react'
import { useAuthState } from '@/hooks/use-auth-state'

const DISMISSED_KEY = 'cinegacha_save_tooltip_dismissed'

export function SaveTooltip() {
  const { isAnonymous, loading } = useAuthState()
  const [dismissed, setDismissed] = useState(() =>
    typeof window === 'undefined' ? true : localStorage.getItem(DISMISSED_KEY) === 'true'
  )
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setDismissed(true)
  }

  // Don't render during SSR, while loading, if authenticated, or if dismissed
  if (!mounted || loading || !isAnonymous || dismissed) {
    return null
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-accent/20 bg-accent/5 px-4 py-2.5 text-sm">
      <div className="flex items-center gap-2">
        {/* Cloud/save icon */}
        <svg
          className="h-4 w-4 shrink-0 text-accent"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M4.406 3.342A5.53 5.53 0 0 1 8 2c2.69 0 4.923 2 5.166 4.579C14.758 6.804 16 8.137 16 9.773 16 11.569 14.502 13 12.687 13H3.781C1.708 13 0 11.366 0 9.318c0-1.763 1.266-3.223 2.942-3.475A5.53 5.53 0 0 1 4.406 3.342z" />
        </svg>
        <span className="text-text-secondary">Sign in to save your collection across devices</span>
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="shrink-0 cursor-pointer text-text-muted transition-colors hover:text-text-secondary"
      >
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
        </svg>
      </button>
    </div>
  )
}
