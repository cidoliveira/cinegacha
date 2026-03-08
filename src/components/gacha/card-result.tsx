import type { PulledCard } from "@/lib/gacha/types"

const rarityColorMap: Record<PulledCard["rarity"], string> = {
  C: "var(--color-rarity-c)",
  UC: "var(--color-rarity-uc)",
  R: "var(--color-rarity-r)",
  SR: "var(--color-rarity-sr)",
  SSR: "var(--color-rarity-ssr)",
  UR: "var(--color-rarity-ur)",
  LR: "var(--color-rarity-lr)",
}

const cardTypeLabelMap: Record<PulledCard["card_type"], string> = {
  movie: "Movie",
  actor: "Actor",
  director: "Director",
}

/**
 * Single card display in the pack reveal grid.
 *
 * Temporary card component for gacha reveal -- Phase 4 (Card Identity) will
 * build the full card component with distinct type layouts and richer visuals.
 */
export function CardResult({ card }: { card: PulledCard }) {
  const rarityColor = rarityColorMap[card.rarity]

  return (
    <div
      className="flex flex-col overflow-hidden rounded-lg border-2 bg-surface-elevated"
      style={{ borderColor: rarityColor }}
    >
      {/* Card image or placeholder */}
      <div className="relative aspect-[2/3] w-full bg-surface">
        {card.image_path ? (
          <img
            src={`https://image.tmdb.org/t/p/w300${card.image_path}`}
            alt={card.name}
            className="h-full w-full object-cover"
            loading="eager"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-2">
            <span className="text-center font-display text-lg tracking-wide text-text-muted">
              {card.name}
            </span>
          </div>
        )}

        {/* Card type badge */}
        <span className="absolute top-2 left-2 rounded bg-background/80 px-2 py-0.5 text-xs text-text-secondary">
          {cardTypeLabelMap[card.card_type]}
        </span>
      </div>

      {/* Card info */}
      <div className="flex flex-col gap-1 p-3">
        <h3 className="truncate font-display text-base tracking-wide text-text-primary">
          {card.name}
        </h3>

        <span
          className="font-display text-sm tracking-wider"
          style={{ color: rarityColor }}
        >
          {card.rarity}
        </span>

        <div className="mt-1 flex items-center gap-3 text-xs text-text-secondary">
          <span>ATK {card.atk}</span>
          <span>DEF {card.def}</span>
        </div>
      </div>
    </div>
  )
}
