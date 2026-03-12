"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Tilt from "react-parallax-tilt"
import { useReducedMotion } from "motion/react"
import type { CollectionCard } from "@/app/actions/collection"
import { computeEffectiveStats } from "@/lib/card/stats"
import { cardImageUrl } from "@/lib/card/images"
import { RARITY_TIERS } from "@/lib/rarity/tiers"
import { CardTypeBadge } from "@/components/card/card-type-badge"
import { RarityFoilOverlay } from "@/components/card/rarity-foil-overlay"
import { CardShareImage, downloadShareImage } from "@/components/card/card-share-image"
import { useTilt } from "@/hooks/use-tilt"

interface CollectionDetailModalProps {
  card: CollectionCard | null
  albumMembership: string[]
  onClose: () => void
}

/**
 * Enhanced card detail modal for the collection context.
 *
 * Unlike the gacha CardDetailModal, this component already has all card data
 * from the collection query -- no lazy fetch needed.
 *
 * Shows collection-specific info: obtained date and album membership.
 * Dismisses via Escape key, backdrop click, or close button.
 */
export function CollectionDetailModal({
  card,
  albumMembership,
  onClose,
}: CollectionDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Open/close dialog when card changes
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (card) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [card])

  function handleDialogClose() {
    onClose()
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      dialogRef.current?.close()
    }
  }

  const stats = card
    ? computeEffectiveStats(card.atk, card.def, card.stars)
    : null

  return (
    <dialog
      ref={dialogRef}
      onClose={handleDialogClose}
      onClick={handleBackdropClick}
      className="m-auto max-w-md rounded-xl border border-border bg-surface p-0 backdrop:bg-black/80"
    >
      <div className="relative max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="absolute top-3 right-3 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-background/80 text-text-secondary backdrop-blur-sm transition-colors hover:bg-background hover:text-text-primary"
          aria-label="Close"
        >
          X
        </button>

        {card && stats && (
          <ModalContent
            card={card}
            stats={stats}
            albumMembership={albumMembership}
          />
        )}
      </div>
    </dialog>
  )
}

function ModalContent({
  card,
  stats,
  albumMembership,
}: {
  card: CollectionCard
  stats: { atk: number; def: number; dupeCount: number }
  albumMembership: string[]
}) {
  const imageUrl = cardImageUrl(card.image_path, card.card_type, "lg")
  const rarityTier = RARITY_TIERS[card.rarity]
  const atkBonus = stats.atk - card.atk
  const defBonus = stats.def - card.def

  const shareRef = useRef<HTMLDivElement>(null)
  const foilRef = useRef<HTMLDivElement>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const { handlePointerMove, handlePointerLeave } = useTilt(foilRef)

  useEffect(() => {
    setIsTouchDevice(window.matchMedia("(hover: none)").matches)
  }, [])

  const obtainedDate = new Date(card.obtained_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  async function handleShare() {
    if (!shareRef.current) return
    setIsSharing(true)
    try {
      await downloadShareImage(shareRef.current, card.name)
    } catch (err) {
      console.error("Share image generation failed:", err)
    } finally {
      setIsSharing(false)
    }
  }

  const tiltEnabled = !isTouchDevice && !prefersReducedMotion

  // CollectionCard has all fields needed by CardShareImage -- cast to satisfy type
  const shareCard = card as Parameters<typeof CardShareImage>[0]["card"]

  return (
    <>
      {/* Large card image with tilt and foil */}
      <Tilt
        tiltMaxAngleX={12}
        tiltMaxAngleY={12}
        perspective={600}
        scale={1.02}
        transitionSpeed={300}
        gyroscope={false}
        tiltEnable={tiltEnabled}
        className="relative aspect-[5/7] w-full overflow-hidden rounded-t-xl"
      >
        {/* Foil tracking layer -- receives pointer events for CSS var tracking */}
        <div
          ref={foilRef}
          className="absolute inset-0"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        />

        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={card.name}
            fill
            sizes="(max-width: 640px) 90vw, 400px"
            className="object-cover"
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-elevated">
            <span className="text-center font-display text-2xl tracking-wide text-text-muted">
              {card.name}
            </span>
          </div>
        )}

        {/* Foil overlay -- C/UC return null internally */}
        <RarityFoilOverlay rarity={card.rarity} context="modal" />
      </Tilt>

      {/* Card info */}
      <div className="flex flex-col gap-4 p-5">
        {/* Name */}
        <h2 className="font-display text-2xl tracking-wide text-text-primary">
          {card.name}
        </h2>

        {/* Type badge + Rarity label */}
        <div className="flex items-center gap-3">
          <CardTypeBadge type={card.card_type} />
          <span
            className="font-display text-sm tracking-wider"
            style={{
              color: `var(--color-rarity-${card.rarity.toLowerCase()})`,
            }}
          >
            {card.rarity} - {rarityTier.label}
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

        {/* Obtained date */}
        <div className="border-t border-border pt-4">
          <span className="text-xs text-text-muted">Collected on </span>
          <span className="font-display text-sm tracking-wider text-text-secondary">
            {obtainedDate}
          </span>
        </div>

        {/* Album membership -- disabled, uncomment to re-enable
        {albumMembership.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Albums
            </span>
            <div className="flex flex-wrap gap-2">
              {albumMembership.map((albumName) => (
                <span
                  key={albumName}
                  className="rounded-full bg-surface-elevated px-3 py-1 text-xs font-medium text-text-secondary"
                >
                  {albumName}
                </span>
              ))}
            </div>
          </div>
        )} */}

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
        <CardShareImage card={shareCard} containerRef={shareRef} />
      </div>
    </>
  )
}
