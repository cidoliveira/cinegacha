'use client'

import { useCallback, useState } from 'react'

const AD_UNIT_ID = process.env.NEXT_PUBLIC_ADSENSE_REWARDED_AD_UNIT ?? ''

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
  const isLoaded = !AD_UNIT_ID
  const [isShowing, setIsShowing] = useState(false)

  const show = useCallback(async (): Promise<void> => {
    if (AD_UNIT_ID) {
      throw new Error('Rewarded ad SDK is not configured in the open-source build')
    }

    setIsShowing(true)
    try {
      await Promise.resolve()
    } finally {
      setIsShowing(false)
    }
  }, [])

  return { isLoaded, isShowing, show }
}
