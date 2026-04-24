'use client'

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
      <div className="flex items-baseline gap-3">
        <span className="text-lg tabular-nums text-text-primary">
          {collected}
          <span className="text-text-muted"> / {total}</span>
        </span>
        <span className="text-xs text-text-muted">cards collected</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-4 text-xs text-text-muted">
        <span>
          <span className="text-amber-400">{byType.movie}</span> films
        </span>
        <span>
          <span className="text-sky-400">{byType.actor}</span> actors
        </span>
        <span>
          <span className="text-violet-400">{byType.director}</span> directors
        </span>
      </div>
    </div>
  )
}
