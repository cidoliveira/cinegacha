type CardType = "movie" | "actor" | "director"

const TYPE_CONFIG: Record<
  CardType,
  { label: string; prefix: string; textColor: string }
> = {
  movie: { label: "MOVIE", prefix: "\u{1F3AC}", textColor: "text-amber-400" },
  actor: { label: "ACTOR", prefix: "\u2605", textColor: "text-sky-400" },
  director: {
    label: "DIRECTOR",
    prefix: "\u{1F3A5}",
    textColor: "text-violet-400",
  },
}

/**
 * Type label badge for gacha cards (Movie / Actor / Director).
 *
 * Renders a small pill-shaped badge with a unicode symbol prefix
 * and type-tinted text. Positioned by the parent component.
 */
export function CardTypeBadge({ type }: { type: CardType }) {
  const config = TYPE_CONFIG[type]

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 font-display text-xs tracking-wider backdrop-blur-sm ${config.textColor}`}
    >
      <span className="text-[10px]">{config.prefix}</span>
      {config.label}
    </span>
  )
}
