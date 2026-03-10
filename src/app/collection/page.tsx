"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useGuestSession } from "@/hooks/use-guest-session"
import {
  getCollectionPage,
  getCollectionProgress,
  getAlbumsWithProgress,
} from "@/app/actions/collection"
import type {
  CardTypeFilter,
  RarityFilter,
  CollectionSortKey,
  CollectionCard,
  AlbumWithProgress,
} from "@/app/actions/collection"
import { CollectionHero } from "@/components/collection/collection-hero"
import { CollectionFilterBar } from "@/components/collection/collection-filter-bar"
import { CollectionGrid } from "@/components/collection/collection-grid"
import { CollectionDetailModal } from "@/components/collection/collection-detail-modal"
import { AlbumSection } from "@/components/collection/album-section"

type Progress = {
  collected: number
  total: number
  byType: { movie: number; actor: number; director: number }
}

export default function CollectionPage() {
  const { isReady } = useGuestSession()

  const [typeFilters, setTypeFilters] = useState<CardTypeFilter[]>([])
  const [rarityFilters, setRarityFilters] = useState<RarityFilter[]>([])
  const [sort, setSort] = useState<CollectionSortKey>("rarity")
  const [cards, setCards] = useState<CollectionCard[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [albums, setAlbums] = useState<AlbumWithProgress[]>([])
  const [selectedCard, setSelectedCard] = useState<CollectionCard | null>(null)

  const fetchIdRef = useRef(0)
  // Accumulates all fetched cards for album membership lookups
  const allCardsRef = useRef<Map<string, CollectionCard>>(new Map())

  // Compute album membership for the currently selected card
  const albumMembership = selectedCard
    ? albums
        .filter((a) => a.card_ids.includes(selectedCard.card_id))
        .map((a) => a.name)
    : []

  // Fetch progress and albums once session is ready
  useEffect(() => {
    if (!isReady) return

    getCollectionProgress().then((result) => {
      if ("error" in result) {
        console.error("Failed to fetch collection progress:", result.error)
        return
      }
      setProgress(result)
    })

    getAlbumsWithProgress().then((result) => {
      if ("error" in result) {
        console.error("Failed to fetch albums:", result.error)
        return
      }
      setAlbums(result)
    })
  }, [isReady])

  // Reset grid when filters or sort change
  useEffect(() => {
    setCards([])
    setPage(0)
    setHasMore(true)
  }, [typeFilters, rarityFilters, sort])

  // Fetch page -- re-runs when page OR filters change (fetchId prevents stale writes)
  useEffect(() => {
    if (!isReady || !hasMore) return

    const currentFetchId = ++fetchIdRef.current

    setIsLoading(true)

    getCollectionPage(page, {
      types: typeFilters,
      rarities: rarityFilters,
      sort,
    })
      .then((result) => {
        if (currentFetchId !== fetchIdRef.current) return // stale fetch

        if ("error" in result) {
          console.error("Failed to fetch collection page:", result.error)
          return
        }

        // Add fetched cards to the all-cards map for album lookups
        for (const card of result.cards) {
          allCardsRef.current.set(card.card_id, card)
        }

        setCards((prev) =>
          page === 0 ? result.cards : [...prev, ...result.cards]
        )
        setHasMore(result.hasMore)
      })
      .finally(() => {
        if (currentFetchId !== fetchIdRef.current) return
        setIsLoading(false)
      })
  }, [page, typeFilters, rarityFilters, sort, isReady]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return
    setPage((prev) => prev + 1)
  }, [isLoading, hasMore])

  // Session gate
  if (!isReady) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <h1 className="font-display text-4xl tracking-wider text-accent sm:text-5xl">
          CineGacha
        </h1>
        <div className="mt-6 h-0.5 w-16 animate-pulse rounded bg-accent-muted" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <CollectionHero
        collected={progress?.collected ?? 0}
        total={progress?.total ?? 0}
        byType={progress?.byType ?? { movie: 0, actor: 0, director: 0 }}
        isLoading={progress === null}
      />
      <CollectionFilterBar
        typeFilters={typeFilters}
        rarityFilters={rarityFilters}
        sort={sort}
        onTypeFiltersChange={setTypeFilters}
        onRarityFiltersChange={setRarityFilters}
        onSortChange={setSort}
      />
      <CollectionGrid
        cards={cards}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onCardClick={setSelectedCard}
      />
      <AlbumSection
        albums={albums}
        collectedCardMap={allCardsRef.current}
      />
      <CollectionDetailModal
        card={selectedCard}
        albumMembership={albumMembership}
        onClose={() => setSelectedCard(null)}
      />
    </div>
  )
}
