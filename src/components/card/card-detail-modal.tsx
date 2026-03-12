"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Tilt from "react-parallax-tilt"
import { useReducedMotion } from "motion/react"
import type { PulledCard } from "@/lib/gacha/types"
import type {
  CardDisplayData,
  MovieMetadata,
  ActorMetadata,
  DirectorMetadata,
} from "@/lib/card/types"
import { computeEffectiveStats } from "@/lib/card/stats"
import { cardImageUrl } from "@/lib/card/images"
import { RARITY_TIERS } from "@/lib/rarity/tiers"
import { CardTypeBadge } from "@/components/card/card-type-badge"
import { getCardDetail } from "@/app/actions/cards"
import { RarityFoilOverlay } from "@/components/card/rarity-foil-overlay"
import { CardShareImage, downloadShareImage } from "@/components/card/card-share-image"

interface CardDetailModalProps {
  card: PulledCard | null
  onClose: () => void
}

/**
 * Full card detail modal using native HTML dialog element.
 *
 * Opens when `card` is non-null, closes when null.
 * Fetches full card data (including metadata) via server action on open.
 * Dismisses via Escape key, backdrop click, or close button.
 */
export function CardDetailModal({ card, onClose }: CardDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [detail, setDetail] = useState<CardDisplayData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Open/close dialog and fetch detail when card changes
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (card) {
      setIsLoading(true)
      setDetail(null)
      dialog.showModal()

      getCardDetail(card.card_id).then((result) => {
        if ("data" in result) {
          setDetail(result.data)
        }
        setIsLoading(false)
      })
    } else {
      dialog.close()
    }
  }, [card])

  // Handle native dialog close event (fires on Escape)
  function handleDialogClose() {
    onClose()
  }

  // Handle backdrop click -- clicks on the dialog element itself (not children)
  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      dialogRef.current.close()
    }
  }

  const stats = detail
    ? computeEffectiveStats(detail.atk, detail.def, detail.stars)
    : null

  return (
    <dialog
      ref={dialogRef}
      onClose={handleDialogClose}
      onClick={handleBackdropClick}
      className="m-auto max-w-md rounded-xl border border-border bg-surface p-0 backdrop:bg-black/80"
    >
      <div className="relative max-h-[90vh] overflow-y-auto overflow-x-hidden">
        {/* Close button */}
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="absolute top-3 right-3 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-background/80 text-text-secondary backdrop-blur-sm transition-colors hover:bg-background hover:text-text-primary"
          aria-label="Close"
        >
          X
        </button>

        {isLoading || !detail ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-0.5 w-16 animate-pulse rounded bg-accent-muted" />
          </div>
        ) : (
          <DetailContent detail={detail} stats={stats!} />
        )}
      </div>
    </dialog>
  )
}

/** Renders the full card detail content inside the modal */
function DetailContent({
  detail,
  stats,
}: {
  detail: CardDisplayData
  stats: { atk: number; def: number; dupeCount: number }
}) {
  const imageUrl = cardImageUrl(detail.image_path, detail.card_type, "lg")
  const rarityTier = RARITY_TIERS[detail.rarity]
  const baseAtk = detail.atk
  const baseDef = detail.def
  const atkBonus = stats.atk - baseAtk
  const defBonus = stats.def - baseDef

  const shareRef = useRef<HTMLDivElement>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    setIsTouchDevice(window.matchMedia("(hover: none)").matches)
  }, [])

  async function handleShare() {
    if (!shareRef.current) return
    setIsSharing(true)
    try {
      await downloadShareImage(shareRef.current, detail.name)
    } catch (err) {
      console.error("Share image generation failed:", err)
    } finally {
      setIsSharing(false)
    }
  }

  const tiltEnabled = !isTouchDevice && !prefersReducedMotion

  return (
    <>
      {/* Large image with tilt and foil */}
      <Tilt
        tiltMaxAngleX={10}
        tiltMaxAngleY={10}
        perspective={800}
        scale={1}
        transitionSpeed={300}
        gyroscope={false}
        tiltEnable={tiltEnabled}
        className="relative aspect-[5/7] w-full overflow-hidden rounded-t-xl"
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={detail.name}
            fill
            sizes="(max-width: 640px) 90vw, 400px"
            className="object-cover"
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-elevated">
            <span className="text-center font-display text-2xl tracking-wide text-text-muted">
              {detail.name}
            </span>
          </div>
        )}

        {/* Foil overlay -- rendered above image, C/UC return null internally */}
        <RarityFoilOverlay rarity={detail.rarity} context="modal" />
      </Tilt>

      {/* Card info */}
      <div className="flex flex-col gap-4 p-5">
        {/* Name */}
        <h2 className="font-display text-2xl tracking-wide text-text-primary">
          {detail.name}
        </h2>

        {/* Type badge + Rarity label */}
        <div className="flex items-center gap-3">
          <CardTypeBadge type={detail.card_type} />
          <span
            className="font-display text-sm tracking-wider"
            style={{
              color: `var(--color-rarity-${detail.rarity.toLowerCase()})`,
            }}
          >
            {detail.rarity} - {rarityTier.label}
          </span>
        </div>

        {/* Duplicate bonus indicator */}
        {stats.dupeCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="rounded bg-green-400/10 px-2 py-0.5 text-xs font-semibold text-green-400">
              +{stats.dupeCount * 10}% stats from duplicates
            </span>
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-text-muted">ATK</span>
            <span className="font-display text-xl tracking-wider text-text-primary">
              {stats.atk}
              {atkBonus > 0 && (
                <span className="ml-1 text-sm text-green-400">
                  (+{atkBonus})
                </span>
              )}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-text-muted">DEF</span>
            <span className="font-display text-xl tracking-wider text-text-primary">
              {stats.def}
              {defBonus > 0 && (
                <span className="ml-1 text-sm text-green-400">
                  (+{defBonus})
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Type-specific metadata */}
        <MetadataSection
          cardType={detail.card_type}
          metadata={detail.metadata}
        />

        {/* Share button */}
        <button
          type="button"
          onClick={handleShare}
          disabled={isSharing}
          className="mt-1 w-full cursor-pointer rounded-lg border border-border bg-surface-elevated px-4 py-2 font-display text-sm tracking-wider text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSharing ? "Generating..." : "Share Card"}
        </button>
      </div>

      {/* Off-screen share card -- must NOT be display:none for html-to-image */}
      <div
        style={{
          position: "fixed",
          top: "-9999px",
          left: "-9999px",
          pointerEvents: "none",
        }}
      >
        <CardShareImage card={detail} containerRef={shareRef} />
      </div>
    </>
  )
}

/** Renders type-specific metadata based on card_type */
function MetadataSection({
  cardType,
  metadata,
}: {
  cardType: CardDisplayData["card_type"]
  metadata: CardDisplayData["metadata"]
}) {
  if (!metadata || Object.keys(metadata).length === 0) return null

  return (
    <div className="border-t border-border pt-4">
      <h3 className="mb-2 text-xs font-semibold tracking-wider text-text-muted uppercase">
        Details
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {cardType === "movie" && <MovieMeta metadata={metadata as MovieMetadata} />}
        {cardType === "actor" && <ActorMeta metadata={metadata as ActorMetadata} />}
        {cardType === "director" && (
          <DirectorMeta metadata={metadata as DirectorMetadata} />
        )}
      </div>
    </div>
  )
}

function MovieMeta({ metadata }: { metadata: MovieMetadata }) {
  return (
    <>
      {metadata.release_date && (
        <MetaItem label="Year" value={metadata.release_date.slice(0, 4)} />
      )}
      {metadata.vote_average != null && (
        <MetaItem
          label="Rating"
          value={`${metadata.vote_average.toFixed(1)}/10`}
        />
      )}
      {metadata.original_language && (
        <MetaItem
          label="Language"
          value={metadata.original_language.toUpperCase()}
        />
      )}
    </>
  )
}

function ActorMeta({ metadata }: { metadata: ActorMetadata }) {
  return (
    <>
      {metadata.credit_count != null && (
        <MetaItem label="Credits" value={String(metadata.credit_count)} />
      )}
      {metadata.avg_movie_vote != null && (
        <MetaItem
          label="Avg Rating"
          value={`${metadata.avg_movie_vote.toFixed(1)}/10`}
        />
      )}
    </>
  )
}

function DirectorMeta({ metadata }: { metadata: DirectorMetadata }) {
  return (
    <>
      {metadata.credit_count != null && (
        <MetaItem label="Credits" value={String(metadata.credit_count)} />
      )}
      {metadata.avg_movie_vote != null && (
        <MetaItem
          label="Avg Rating"
          value={`${metadata.avg_movie_vote.toFixed(1)}/10`}
        />
      )}
      {metadata.career_consistency != null && (
        <MetaItem
          label="Consistency"
          value={`${Math.round(metadata.career_consistency * 100)}%`}
        />
      )}
    </>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="font-display text-sm tracking-wider text-text-secondary">
        {value}
      </span>
    </div>
  )
}
