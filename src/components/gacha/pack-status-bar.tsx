"use client"

import { useEffect } from "react"
import { usePackTimer } from "@/hooks/use-pack-timer"
import { MAX_PACKS, PITY_THRESHOLD } from "@/lib/gacha/constants"

interface PackStatusBarProps {
  packsAvailable: number
  pityCounter: number
  nextPackAt: string | null
  onPackReady?: () => void
}

/**
 * Pack count, pity counter, and regeneration timer display.
 *
 * Pack count is the hero element -- big, bold, front and center.
 * Pity counter builds anticipation: "Guaranteed SR+ in X packs".
 * Timer shows live countdown when packs are regenerating.
 */
export function PackStatusBar({
  packsAvailable,
  pityCounter,
  nextPackAt,
  onPackReady,
}: PackStatusBarProps) {
  const timer = usePackTimer(nextPackAt)

  useEffect(() => {
    if (timer.isReady) {
      onPackReady?.()
    }
  }, [timer.isReady, onPackReady])

  const packsUntilPity = PITY_THRESHOLD - pityCounter

  return (
    <div className="flex flex-col items-center gap-3 border-b border-border pb-6 sm:flex-row sm:justify-between sm:gap-6">
      {/* Pack count -- hero element */}
      <div className="text-center sm:text-left">
        <p
          className={`font-display text-5xl tracking-wider sm:text-6xl ${
            packsAvailable > 0 ? "text-accent" : "text-text-muted"
          }`}
        >
          {packsAvailable}/{MAX_PACKS}
        </p>
        <p className="font-display text-sm tracking-wider text-text-secondary uppercase">
          Packs
        </p>
      </div>

      {/* Pity + timer info */}
      <div className="flex flex-col items-center gap-1 sm:items-end">
        <p className="text-sm text-text-secondary">
          Guaranteed SR+ in{" "}
          <span className="text-text-primary">
            {packsUntilPity} {packsUntilPity === 1 ? "pack" : "packs"}
          </span>
        </p>

        {timer.display !== null ? (
          <p className="text-sm text-text-muted">
            Next pack in{" "}
            <span className="font-display tracking-wider text-text-secondary">
              {timer.display}
            </span>
          </p>
        ) : packsAvailable >= MAX_PACKS ? (
          <p className="text-sm text-text-muted">Packs full</p>
        ) : null}
      </div>
    </div>
  )
}
