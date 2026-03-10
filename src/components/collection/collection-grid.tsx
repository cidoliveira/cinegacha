"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import type { CollectionCard } from "@/app/actions/collection"
import { GachaCard } from "@/components/card/gacha-card"

interface CollectionGridProps {
  cards: CollectionCard[]
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
  onCardClick?: (card: CollectionCard) => void
}

export function CollectionGrid({
  cards,
  isLoading,
  hasMore,
  onLoadMore,
  onCardClick,
}: CollectionGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore) {
          onLoadMore()
        }
      },
      { rootMargin: "200px" }
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [onLoadMore, hasMore])

  // Initial loading skeleton
  if (isLoading && cards.length === 0) {
    return (
      <div className="max-w-7xl mx-auto w-full px-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[5/7] animate-pulse rounded-lg bg-surface-elevated"
            />
          ))}
        </div>
      </div>
    )
  }

  // Empty state
  if (!isLoading && cards.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <h2 className="font-display text-3xl tracking-wider text-text-primary">
          No cards yet
        </h2>
        <p className="mt-2 font-body text-text-muted">
          Open some packs to start your collection!
        </p>
        <Link
          href="/gacha"
          className="mt-6 rounded-lg bg-accent px-6 py-2.5 font-body text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Open Packs
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <GachaCard
            key={card.card_id}
            card={card}
            size="md"
            onClick={onCardClick ? () => onCardClick(card) : undefined}
          />
        ))}

        {/* Sentinel for infinite scroll -- spans full grid width */}
        <div ref={sentinelRef} className="col-span-full h-4" />
      </div>

      {/* Loading more indicator */}
      {isLoading && cards.length > 0 && (
        <div className="mt-4 flex justify-center">
          <div className="h-0.5 w-16 animate-pulse rounded bg-accent-muted" />
        </div>
      )}
    </div>
  )
}
