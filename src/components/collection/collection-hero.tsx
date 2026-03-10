"use client"

interface CollectionHeroProps {
  collected: number
  total: number
  byType: {
    movie: number
    actor: number
    director: number
  }
  isLoading?: boolean
}

export function CollectionHero({
  collected,
  total,
  byType,
  isLoading = false,
}: CollectionHeroProps) {
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="h-12 w-48 animate-pulse rounded-lg bg-surface-elevated" />
        <div className="mt-4 flex gap-6">
          <div className="h-5 w-24 animate-pulse rounded bg-surface-elevated" />
          <div className="h-5 w-24 animate-pulse rounded bg-surface-elevated" />
          <div className="h-5 w-24 animate-pulse rounded bg-surface-elevated" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <p className="font-display text-5xl tracking-wider text-text-primary sm:text-6xl">
        <span className="text-accent">{collected}</span>
        <span className="mx-2 text-text-muted">/</span>
        <span>{total}</span>
        <span className="ml-3 font-display text-2xl tracking-wide text-text-secondary sm:text-3xl">
          cards
        </span>
      </p>

      <div className="mt-4 flex flex-wrap gap-6">
        <span className="font-body text-sm text-text-secondary">
          <span className="font-semibold text-amber-500">Movies:</span>{" "}
          {byType.movie}
        </span>
        <span className="font-body text-sm text-text-secondary">
          <span className="font-semibold text-sky-500">Actors:</span>{" "}
          {byType.actor}
        </span>
        <span className="font-body text-sm text-text-secondary">
          <span className="font-semibold text-violet-500">Directors:</span>{" "}
          {byType.director}
        </span>
      </div>
    </div>
  )
}
