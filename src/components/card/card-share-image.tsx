"use client"

import { useRef } from "react"
import type { CardDisplayData } from "@/lib/card/types"
import { cardImageUrl } from "@/lib/card/images"
import { computeEffectiveStats } from "@/lib/card/stats"
import { RARITY_TIERS } from "@/lib/rarity/tiers"

// Hardcoded theme colors (CSS custom properties do not serialize reliably for html-to-image)
const COLORS = {
  background: "#0a0908",
  surface: "#151311",
  surfaceElevated: "#1f1c18",
  border: "#2e2a24",
  textPrimary: "#e8dcc8",
  textSecondary: "#a89e8e",
  textMuted: "#6b6358",
  accent: "#c9a84c",
  rarity: {
    c: "#9ca3af",
    uc: "#6bcb8a",
    r: "#6a9fd4",
    sr: "#b87fd4",
    ssr: "#d4a83a",
    ur: "#d45454",
    lr: "#d46ea0",
  },
} as const

const TYPE_COLORS: Record<CardDisplayData["card_type"], string> = {
  movie: "#f59e0b",
  actor: "#38bdf8",
  director: "#a78bfa",
}

const TYPE_LABELS: Record<CardDisplayData["card_type"], string> = {
  movie: "MOVIE",
  actor: "ACTOR",
  director: "DIRECTOR",
}

function getRarityColor(rarity: CardDisplayData["rarity"]): string {
  return COLORS.rarity[rarity.toLowerCase() as keyof typeof COLORS.rarity]
}

interface CardShareImageProps {
  card: CardDisplayData
  containerRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Off-screen render target for social share image capture.
 *
 * Parent must position this off-screen (position:fixed, top:-9999px).
 * Do NOT use display:none -- html-to-image cannot capture hidden elements.
 *
 * Uses standard <img> tags (NOT next/image) for html-to-image compatibility.
 * All TMDB images go through /api/image-proxy to avoid canvas CORS taint.
 * All styles are inline to ensure reliable serialization by html-to-image.
 */
export function CardShareImage({ card, containerRef }: CardShareImageProps) {
  const rarityColor = getRarityColor(card.rarity)
  const rarityLabel = RARITY_TIERS[card.rarity].label
  const typeColor = TYPE_COLORS[card.card_type]
  const typeLabel = TYPE_LABELS[card.card_type]
  const { atk, def, dupeCount } = computeEffectiveStats(card.atk, card.def, card.stars)

  // Build full TMDB URL then route through same-origin proxy to avoid canvas taint
  const rawImageUrl = cardImageUrl(card.image_path, card.card_type, "lg")
  const proxiedImageUrl = rawImageUrl
    ? `/api/image-proxy?url=${encodeURIComponent(rawImageUrl)}`
    : null

  const isHighRarity =
    card.rarity === "SR" ||
    card.rarity === "SSR" ||
    card.rarity === "UR" ||
    card.rarity === "LR"

  const borderWidth = isHighRarity ? 3 : 2

  return (
    <div
      ref={containerRef}
      style={{
        width: 400,
        height: 560,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: 12,
        backgroundColor: COLORS.surface,
        border: `${borderWidth}px solid ${rarityColor}`,
        fontFamily: "system-ui, sans-serif",
        position: "relative",
      }}
    >
      {/* Card image area (~65%) */}
      <div
        style={{
          position: "relative",
          flex: "0 0 364px",
          overflow: "hidden",
        }}
      >
        {proxiedImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proxiedImageUrl}
            alt={card.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: COLORS.surfaceElevated,
              padding: "8px",
            }}
          >
            <span
              style={{
                textAlign: "center",
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 18,
                letterSpacing: "0.05em",
                color: COLORS.textMuted,
              }}
            >
              {card.name}
            </span>
          </div>
        )}

        {/* Type badge -- top left */}
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            borderRadius: 9999,
            backgroundColor: "rgba(10, 9, 8, 0.82)",
            paddingLeft: 8,
            paddingRight: 8,
            paddingTop: 2,
            paddingBottom: 2,
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 11,
            letterSpacing: "0.08em",
            color: typeColor,
          }}
        >
          {typeLabel}
        </div>

        {/* Rarity badge -- top right */}
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            borderRadius: 9999,
            backgroundColor: "rgba(10, 9, 8, 0.82)",
            paddingLeft: 8,
            paddingRight: 8,
            paddingTop: 2,
            paddingBottom: 2,
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 11,
            letterSpacing: "0.08em",
            color: rarityColor,
          }}
        >
          {card.rarity}
        </span>

        {/* Dupe bonus badge -- bottom right */}
        {dupeCount > 0 && (
          <span
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              borderRadius: 4,
              backgroundColor: "rgba(31, 28, 24, 0.92)",
              paddingLeft: 6,
              paddingRight: 6,
              paddingTop: 2,
              paddingBottom: 2,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: "#4ade80",
            }}
          >
            +{dupeCount * 10}%
          </span>
        )}
      </div>

      {/* Info section (~35%) */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: COLORS.surfaceElevated,
          borderTop: `2px solid ${typeColor}33`,
          padding: "10px 12px 10px 12px",
          position: "relative",
        }}
      >
        {/* Name + rarity label */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <h3
            style={{
              margin: 0,
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 22,
              letterSpacing: "0.04em",
              color: COLORS.textPrimary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {card.name}
          </h3>
          <span
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 11,
              letterSpacing: "0.1em",
              color: rarityColor,
            }}
          >
            {rarityLabel}
          </span>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 13,
              letterSpacing: "0.08em",
            }}
          >
            <span style={{ color: COLORS.textSecondary }}>
              <span style={{ color: COLORS.textMuted }}>ATK</span> {atk}
            </span>
            <span style={{ color: COLORS.textSecondary }}>
              <span style={{ color: COLORS.textMuted }}>DEF</span> {def}
            </span>
          </div>

          {/* CineGacha watermark */}
          <span
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 10,
              letterSpacing: "0.1em",
              color: COLORS.textMuted,
              opacity: 0.5,
            }}
          >
            CineGacha
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Capture the share image container as a JPEG and trigger a browser download.
 *
 * Dynamically imports html-to-image to keep it out of the initial bundle.
 * Should be called with the HTMLDivElement from containerRef.current.
 */
export async function downloadShareImage(
  el: HTMLDivElement,
  cardName: string
): Promise<void> {
  const { toJpeg } = await import("html-to-image")
  const dataUrl = await toJpeg(el, {
    quality: 0.92,
    pixelRatio: 2,
    cacheBust: true,
  })
  const link = document.createElement("a")
  link.download = `cinegacha-${cardName.toLowerCase().replace(/\s+/g, "-")}.jpg`
  link.href = dataUrl
  link.click()
}
