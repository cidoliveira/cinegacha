'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useGuestSession } from '@/hooks/use-guest-session'
import { getCollectionPage, getCollectionProgress } from '@/app/actions/collection'
import type {
  CardTypeFilter,
  RarityFilter,
  CollectionSortKey,
  CollectionCard,
} from '@/app/actions/collection'
import { CollectionHero } from '@/components/collection/collection-hero'
import { CollectionFilterBar } from '@/components/collection/collection-filter-bar'
import { CollectionGrid } from '@/components/collection/collection-grid'
import { CollectionDetailModal } from '@/components/collection/collection-detail-modal'
import { SaveTooltip } from '@/components/collection/save-tooltip'
// import { AlbumSection } from "@/components/collection/album-section"

type Progress = {
  collected: number
  total: number
  byType: { movie: number; actor: number; director: number }
}

export default function CollectionPage() {
  const { isReady } = useGuestSession()

  const [typeFilters, setTypeFilters] = useState<CardTypeFilter[]>([])
  const [rarityFilters, setRarityFilters] = useState<RarityFilter[]>([])
  const [sort, setSort] = useState<CollectionSortKey>('rarity')
  const [cards, setCards] = useState<CollectionCard[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [selectedCard, setSelectedCard] = useState<CollectionCard | null>(null)

  const fetchIdRef = useRef(0)

  // Fetch progress and albums once session is ready
  useEffect(() => {
    if (!isReady) return

    getCollectionProgress().then((result) => {
      if ('error' in result) {
        console.error('Failed to fetch collection progress:', result.error)
        return
      }
      setProgress(result)
    })

    // Albums disabled -- uncomment to re-enable
    // getAlbumsWithProgress().then((result) => {
    //   if ("error" in result) {
    //     console.error("Failed to fetch albums:", result.error)
    //     return
    //   }
    //   setAlbums(result)
    // })
  }, [isReady])

  const resetGrid = useCallback(() => {
    setCards([])
    setPage(0)
    setHasMore(true)
  }, [])

  // Fetch page -- re-runs when page OR filters change (fetchId prevents stale writes)
  useEffect(() => {
    if (!isReady || !hasMore) return

    const currentFetchId = ++fetchIdRef.current

    async function fetchPage() {
      setIsLoading(true)

      try {
        const result = await getCollectionPage(page, {
          types: typeFilters,
          rarities: rarityFilters,
          sort,
        })

        if (currentFetchId !== fetchIdRef.current) return // stale fetch

        if ('error' in result) {
          console.error('Failed to fetch collection page:', result.error)
          return
        }

        setCards((prev) => (page === 0 ? result.cards : [...prev, ...result.cards]))
        setHasMore(result.hasMore)
      } finally {
        if (currentFetchId !== fetchIdRef.current) return
        setIsLoading(false)
      }
    }

    void fetchPage()
  }, [page, typeFilters, rarityFilters, sort, isReady]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return
    setPage((prev) => prev + 1)
  }, [isLoading, hasMore])

  // Session gate
  if (!isReady) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="h-0.5 w-16 animate-pulse rounded bg-text-muted/30" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="mx-auto w-full max-w-7xl px-4 pt-6">
        <SaveTooltip />
      </div>
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
        onTypeFiltersChange={(filters) => {
          resetGrid()
          setTypeFilters(filters)
        }}
        onRarityFiltersChange={(filters) => {
          resetGrid()
          setRarityFilters(filters)
        }}
        onSortChange={(nextSort) => {
          resetGrid()
          setSort(nextSort)
        }}
      />
      <CollectionGrid
        cards={cards}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onCardClick={setSelectedCard}
      />
      {/* Albums disabled -- uncomment to re-enable
      <AlbumSection
        albums={albums}
        collectedCardMap={allCardsRef.current}
      /> */}
      <CollectionDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} />
    </div>
  )
}
