import Image from "next/image"
import type { PulledCard } from "@/lib/gacha/types"
import { computeEffectiveStats } from "@/lib/card/stats"
import { cardImageUrl } from "@/lib/card/images"
import { RARITY_TIERS } from "@/lib/rarity/tiers"
import { CardTypeBadge } from "@/components/card/card-type-badge"
import { CardStats } from "@/components/card/card-stats"
import { CardStars } from "@/components/card/card-stars"

type CardSize = "sm" | "md" | "lg"

/**
 * Type-specific color tint applied to the info section top border.
 * Provides at-a-glance visual distinction between card types.
 */
const TYPE_TINT: Record<PulledCard["card_type"], string> = {
  movie: "border-t-amber-500/40",
  actor: "border-t-sky-500/40",
  director: "border-t-violet-500/40",
}

/**
 * Responsive `sizes` hints for Next.js Image based on card size prop.
 * Helps the browser pick the optimal image resolution to download.
 */
const IMAGE_SIZES: Record<CardSize, string> = {
  sm: "(max-width: 640px) 30vw, (max-width: 1024px) 20vw, 12vw",
  md: "(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 18vw",
  lg: "(max-width: 640px) 90vw, (max-width: 1024px) 60vw, 40vw",
}

interface GachaCardProps {
  card: PulledCard
  size?: CardSize
  onClick?: () => void
}

/**
 * TCG-style gacha card with type-variant visual identity.
 *
 * Displays a portrait card (5:7 ratio) with:
 * - Rarity-colored border
 * - TMDB poster/profile image via Next.js Image
 * - Type badge (Movie / Actor / Director)
 * - Rarity label
 * - Card name
 * - Rarity tier text
 * - Effective ATK/DEF stats (with star bonus)
 * - Filled star indicators
 *
 * Visual type differentiation via color-tinted info section border.
 */
export function GachaCard({ card, size = "md", onClick }: GachaCardProps) {
  const imageUrl = cardImageUrl(card.image_path, card.card_type, size)
  const { atk, def, displayStars } = computeEffectiveStats(
    card.atk,
    card.def,
    card.stars
  )
  const rarityLabel = RARITY_TIERS[card.rarity].label
  const isHighRarity =
    card.rarity === "SR" ||
    card.rarity === "SSR" ||
    card.rarity === "UR" ||
    card.rarity === "LR"

  const Wrapper = onClick ? "button" : "div"
  const interactiveClasses = onClick
    ? "cursor-pointer transition-transform hover:scale-[1.02]"
    : ""

  return (
    <Wrapper
      className={`flex aspect-[5/7] flex-col overflow-hidden rounded-lg bg-surface ${interactiveClasses}`}
      style={{
        borderWidth: isHighRarity ? 3 : 2,
        borderStyle: "solid",
        borderColor: `var(--color-rarity-${card.rarity.toLowerCase()})`,
      }}
      {...(onClick ? { onClick, type: "button" as const } : {})}
    >
      {/* Image section (~60%) */}
      <div className="relative min-h-0 flex-[3]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={card.name}
            fill
            sizes={IMAGE_SIZES[size]}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface px-2">
            <span className="text-center font-display text-lg tracking-wide text-text-muted">
              {card.name}
            </span>
          </div>
        )}

        {/* Type badge -- top left */}
        <div className="absolute top-2 left-2">
          <CardTypeBadge type={card.card_type} />
        </div>

        {/* Rarity label -- top right */}
        <span
          className="absolute top-2 right-2 rounded-full bg-background/80 px-2 py-0.5 font-display text-xs tracking-wider backdrop-blur-sm"
          style={{
            color: `var(--color-rarity-${card.rarity.toLowerCase()})`,
          }}
        >
          {card.rarity}
        </span>
      </div>

      {/* Info section (~40%) -- type-tinted top border */}
      <div
        className={`flex min-h-0 flex-[2] flex-col justify-between border-t-2 bg-surface-elevated p-2 ${TYPE_TINT[card.card_type]}`}
      >
        <div className="flex flex-col gap-0.5">
          <h3 className="truncate font-display text-base tracking-wide text-text-primary">
            {card.name}
          </h3>
          <span
            className="font-display text-xs tracking-wider"
            style={{
              color: `var(--color-rarity-${card.rarity.toLowerCase()})`,
            }}
          >
            {rarityLabel}
          </span>
        </div>

        <div className="flex items-end justify-between">
          <CardStats atk={atk} def={def} />
          <CardStars count={displayStars} />
        </div>
      </div>
    </Wrapper>
  )
}
