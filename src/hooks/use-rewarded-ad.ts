'use client'

import { useCallback, useState } from 'react'

interface UseRewardedAdReturn {
  /** Whether the local rewarded-ad flow can be triggered. */
  isLoaded: boolean
  /** Whether the local rewarded-ad flow is currently active. */
  isShowing: boolean
  /** Resolve when the local reward flow completes. */
  show: () => Promise<void>
}

/**
 * Development-safe rewarded-ad abstraction.
 *
 * The open-source build does not include a production rewarded-ad SDK integration.
 * With no ad unit configured, show() resolves immediately so the pack-refill flow
 * can be tested locally without an ad provider.
 */
export function useRewardedAd(): UseRewardedAdReturn {
  const [isLoaded] = useState(true)
  const [isShowing, setIsShowing] = useState(false)

  const show = useCallback(async (): Promise<void> => {
    setIsShowing(true)
    try {
      await Promise.resolve()
    } finally {
      setIsShowing(false)
    }
  }, [])

  return { isLoaded, isShowing, show }
}
