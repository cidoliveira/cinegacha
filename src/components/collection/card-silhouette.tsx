"use client"

import type { RarityFilter } from "@/app/actions/collection"

interface CardSilhouetteProps {
  rarity: RarityFilter
}

/**
 * Ghosted placeholder card for uncollected cards in album view.
 *
 * Matches GachaCard's 5:7 aspect ratio with a rarity-colored border.
 * Non-interactive -- purely visual placeholder.
 */
export function CardSilhouette({ rarity }: CardSilhouetteProps) {
  return (
    <div
      className="flex aspect-[5/7] w-full flex-col overflow-hidden rounded-lg bg-surface opacity-30"
      style={{
        border: "2px solid",
        borderColor: `var(--color-rarity-${rarity.toLowerCase()})`,
      }}
    >
      {/* Image area (~60%) */}
      <div className="relative flex min-h-0 flex-[3] items-center justify-center bg-surface-elevated">
        <span className="font-display text-2xl tracking-wider text-text-muted">
          ?
        </span>
      </div>

      {/* Info area (~40%) */}
      <div className="min-h-0 flex-[2] border-t border-border bg-surface" />
    </div>
  )
}
