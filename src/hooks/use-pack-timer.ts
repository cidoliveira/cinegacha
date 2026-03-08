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
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!nextPackAt) {
      setSecondsLeft(null)
      return
    }

    function tick() {
      const diff = Math.max(
        0,
        Math.floor((new Date(nextPackAt!).getTime() - Date.now()) / 1000),
      )
      setSecondsLeft(diff)
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [nextPackAt])

  return {
    secondsLeft,
    isReady: secondsLeft === 0,
    display:
      secondsLeft !== null
        ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
        : null,
  }
}
