type CardType = 'movie' | 'actor' | 'director'

const TYPE_CONFIG: Record<CardType, { label: string; textColor: string }> = {
  movie: { label: 'FILM', textColor: 'text-amber-400' },
  actor: { label: 'ACTOR', textColor: 'text-sky-400' },
  director: { label: 'DIRECTOR', textColor: 'text-violet-400' },
}

/**
 * Type label badge for gacha cards (Movie / Actor / Director).
 *
 * Renders a small pill-shaped badge with a unicode symbol prefix
 * and type-tinted text. Positioned by the parent component.
 */
export function CardTypeBadge({ type, className }: { type: CardType; className?: string }) {
  const config = TYPE_CONFIG[type]

  return (
    <span
      className={`inline-flex items-center rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium tracking-widest backdrop-blur-sm ${config.textColor} ${className ?? ''}`}
    >
      {config.label}
    </span>
  )
}
