"use client"

import { useCallback, useRef, useState } from "react"

const AD_UNIT_ID = process.env.NEXT_PUBLIC_ADSENSE_REWARDED_AD_UNIT ?? ""

interface UseRewardedAdReturn {
  /** Whether the ad is ready to show */
  isLoaded: boolean
  /** Whether the ad is currently showing */
  isShowing: boolean
  /** Show the rewarded ad. Resolves when reward is granted, rejects on dismiss/error. */
  show: () => Promise<void>
}

/**
 * Wrapper hook for Google AdSense rewarded ads.
 *
 * Loads the ad on mount, provides show() that returns a promise.
 * If the ad SDK is not available (no AD_UNIT_ID, blocked, dev mode),
 * show() resolves immediately (acts as a pass-through for development).
 */
export function useRewardedAd(): UseRewardedAdReturn {
  const [isLoaded] = useState(true)
  const [isShowing, setIsShowing] = useState(false)
  const resolveRef = useRef<(() => void) | null>(null)
  const rejectRef = useRef<((err: Error) => void) | null>(null)

  const show = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Dev mode / no ad unit: resolve immediately (skip ad)
      if (!AD_UNIT_ID) {
        resolve()
        return
      }

      resolveRef.current = resolve
      rejectRef.current = reject
      setIsShowing(true)

      // TODO: Trigger actual Google AdSense rewarded ad here
      // On reward callback: resolveRef.current?.()
      // On dismiss/error: rejectRef.current?.(new Error("Ad dismissed"))
      // For now, simulate with a timeout
      setTimeout(() => {
        setIsShowing(false)
        resolveRef.current?.()
        resolveRef.current = null
        rejectRef.current = null
      }, 1000)
    })
  }, [])

  return { isLoaded, isShowing, show }
}
