"use client"

import { useState, useEffect } from "react"

/**
 * Live countdown timer for pack regeneration.
 *
 * Takes a nextPackAt ISO timestamp (from get_pack_status RPC) and provides
 * a ticking countdown. Returns null values when packs are full (nextPackAt is null).
 *
 * @param nextPackAt - ISO timestamp string for next pack, or null if at max packs
 * @returns secondsLeft (number | null), isReady (boolean), display (M:SS string | null)
 */
export function usePackTimer(nextPackAt: string | null) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!nextPackAt) return

    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [nextPackAt])

  const secondsLeft = nextPackAt
    ? Math.max(0, Math.floor((new Date(nextPackAt).getTime() - now) / 1000))
    : null

  return {
    secondsLeft,
    isReady: secondsLeft === 0,
    display:
      secondsLeft !== null
        ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
        : null,
  }
}
