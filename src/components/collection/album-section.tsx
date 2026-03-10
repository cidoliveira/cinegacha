"use client"

import { useState } from "react"
import type { AlbumWithProgress, CollectionCard } from "@/app/actions/collection"
import { GachaCard } from "@/components/card/gacha-card"
import { CardSilhouette } from "@/components/collection/card-silhouette"

interface AlbumSectionProps {
  albums: AlbumWithProgress[]
  collectedCardMap: Map<string, CollectionCard>
}

/**
 * Genre albums section with expandable inline card grids.
 *
 * Each album row shows genre name, X/Y count, completion % and a "Completed"
 * badge when the album is 100% done. Clicking a row expands it inline to show
 * collected cards and silhouette placeholders for missing ones.
 */
export function AlbumSection({ albums, collectedCardMap }: AlbumSectionProps) {
  if (albums.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <p className="font-body text-text-muted">No albums available.</p>
      </div>
    )
  }

  // Sort: completed first, then by completion %, then alphabetically
  const sorted = [...albums].sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? -1 : 1
    if (b.completion_pct !== a.completion_pct)
      return b.completion_pct - a.completion_pct
    return a.name.localeCompare(b.name)
  })

  const completedCount = albums.filter((a) => a.is_completed).length

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Section header */}
      <div className="mb-4">
        <h2 className="font-display text-xl tracking-wider text-text-primary">
          Genre Albums
        </h2>
        <p className="mt-1 font-body text-sm text-text-muted">
          {albums.length} albums &middot; {completedCount} completed
        </p>
      </div>

      {/* Album list */}
      <div className="flex flex-col gap-3">
        {sorted.map((album) => (
          <AlbumCard
            key={album.id}
            album={album}
            collectedCardMap={collectedCardMap}
          />
        ))}
      </div>
    </div>
  )
}

interface AlbumCardProps {
  album: AlbumWithProgress
  collectedCardMap: Map<string, CollectionCard>
}

function AlbumCard({ album, collectedCardMap }: AlbumCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="rounded-lg border border-border bg-surface">
      {/* Album header row -- clickable */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full cursor-pointer items-center gap-3 rounded-lg p-4 text-left transition-colors hover:bg-surface-elevated/50"
      >
        {/* Genre name */}
        <span className="flex-1 font-display text-lg tracking-wider text-text-primary">
          {album.name}
        </span>

        {/* Progress count */}
        <span className="font-body text-sm text-text-secondary">
          {album.collected_ids.length} / {album.card_ids.length}
        </span>

        {/* Completion percentage */}
        <span className="min-w-[3rem] text-right font-display text-sm tracking-wider text-text-muted">
          {album.completion_pct}%
        </span>

        {/* Completed badge */}
        {album.is_completed && (
          <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-semibold text-green-400">
            Completed
          </span>
        )}

        {/* Expand indicator */}
        <span
          className="ml-1 text-text-muted transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          &#8964;
        </span>
      </button>

      {/* Expandable content -- CSS grid-template-rows transition */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="grid grid-cols-2 gap-3 px-4 pb-4 pt-0 sm:grid-cols-3">
            {album.card_ids.map((cardId) => {
              const isCollected = album.collected_ids.includes(cardId)
              const collectedCard = collectedCardMap.get(cardId)

              if (isCollected && collectedCard) {
                // Fully collected: render the actual card
                return (
                  <GachaCard
                    key={cardId}
                    card={collectedCard}
                    size="sm"
                  />
                )
              }

              if (isCollected && !collectedCard) {
                // In collected_ids but not in the local map (edge case: not loaded yet)
                // Render a green-tinted collected placeholder
                return (
                  <div
                    key={cardId}
                    className="flex aspect-[5/7] w-full items-center justify-center rounded-lg border-2 border-green-500/30 bg-green-500/10 opacity-60"
                  >
                    <span className="font-display text-sm text-green-400">
                      &#10003;
                    </span>
                  </div>
                )
              }

              // Not collected: show silhouette placeholder
              return <CardSilhouette key={cardId} rarity="C" />
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
