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

interface CollectionDetailModalProps {
  card: CollectionCard | null
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
      className="m-auto w-full max-w-md rounded-xl border border-border bg-surface p-0 backdrop:bg-black/80"
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

        {card && stats && (
          <ModalContent
            card={card}
            stats={stats}
          />
        )}
      </div>
    </dialog>
  )
}

function ModalContent({
  card,
  stats,
}: {
  card: CollectionCard
  stats: { atk: number; def: number; dupeCount: number }
}) {
  const imageUrl = cardImageUrl(card.image_path, card.card_type, "lg")
  const rarityTier = RARITY_TIERS[card.rarity]
  const atkBonus = stats.atk - card.atk
  const defBonus = stats.def - card.def

  const shareRef = useRef<HTMLDivElement>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [isTouchDevice] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(hover: none)").matches
  )
  const prefersReducedMotion = useReducedMotion()

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
            alt={card.name}
            fill
            sizes="(max-width: 640px) 90vw, 400px"
            className="object-cover"
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-elevated">
            <span className="text-center font-display text-2xl italic text-text-muted">
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
        <h2 className="font-display text-2xl italic text-text-primary">
          {card.name}
        </h2>

        {/* Type badge + Rarity label */}
        <div className="flex items-center gap-3">
          <CardTypeBadge type={card.card_type} />
          <span
            className="text-xs font-medium tracking-widest"
            style={{
              color: `var(--color-rarity-${card.rarity.toLowerCase()})`,
            }}
          >
            {card.rarity} &middot; {rarityTier.label}
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
            <span className="text-xl tabular-nums text-text-primary">
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
            <span className="text-xl tabular-nums text-text-primary">
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
          <span className="text-sm text-text-secondary">
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
          className="mt-1 cursor-pointer border-b border-text-muted pb-0.5 text-xs text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSharing ? "Generating..." : "Share card"}
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
