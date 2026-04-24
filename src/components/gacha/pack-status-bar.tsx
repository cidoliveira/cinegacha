'use client'

import { useEffect } from 'react'
import { usePackTimer } from '@/hooks/use-pack-timer'
import { MAX_PACKS, PITY_THRESHOLD } from '@/lib/gacha/constants'

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
    <div className="flex items-baseline justify-between border-b border-border pb-4">
      {/* Pack count -- understated */}
      <div className="flex items-baseline gap-2">
        <span
          className={`text-lg tabular-nums ${
            packsAvailable > 0 ? 'text-text-primary' : 'text-text-muted'
          }`}
        >
          {packsAvailable}/{MAX_PACKS}
        </span>
        <span className="text-xs text-text-muted">packs</span>
      </div>

      {/* Pity + timer info */}
      <div className="flex items-baseline gap-4 text-xs text-text-muted">
        <span>
          SR+ in <span className="text-text-secondary">{packsUntilPity}</span>
        </span>

        {timer.display !== null ? (
          <span>
            Next <span className="tabular-nums text-text-secondary">{timer.display}</span>
          </span>
        ) : packsAvailable >= MAX_PACKS ? (
          <span>Full</span>
        ) : null}
      </div>
    </div>
  )
}
