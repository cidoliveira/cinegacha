"use client"

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
  accent: "#dc2626",
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
 * Instagram Stories format (540x960 at 2x = 1080x1920).
 *
 * Parent must position this off-screen (position:fixed, top:-9999px).
 * Uses standard <img> tags and inline styles for html-to-image compatibility.
 * All TMDB images go through /api/image-proxy to avoid canvas CORS taint.
 */
export function CardShareImage({ card, containerRef }: CardShareImageProps) {
  const rarityColor = getRarityColor(card.rarity)
  const rarityLabel = RARITY_TIERS[card.rarity].label
  const typeLabel = TYPE_LABELS[card.card_type]
  const { atk, def, dupeCount } = computeEffectiveStats(card.atk, card.def, card.stars)

  const rawImageUrl = cardImageUrl(card.image_path, card.card_type, "lg")
  const proxiedImageUrl = rawImageUrl
    ? `/api/image-proxy?url=${encodeURIComponent(rawImageUrl)}`
    : null

  return (
    <div
      ref={containerRef}
      style={{
        width: 540,
        height: 960,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
        background: `radial-gradient(ellipse at 50% 40%, ${COLORS.surfaceElevated} 0%, ${COLORS.background} 70%)`,
      }}
    >
      {/* Subtle film grain texture via noise pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
          pointerEvents: "none",
        }}
      />

      {/* Top branding */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 16,
            letterSpacing: "0.25em",
            color: COLORS.textMuted,
            opacity: 0.6,
          }}
        >
          CINEGACHA
        </span>
      </div>

      {/* Card container — centered hero */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
          marginTop: -20,
        }}
      >
        {/* Card image with rarity border + glow */}
        <div
          style={{
            position: "relative",
            width: 320,
            height: 448,
            borderRadius: 14,
            overflow: "hidden",
            border: `3px solid ${rarityColor}`,
            boxShadow: `0 0 40px ${rarityColor}33, 0 20px 60px rgba(0,0,0,0.6)`,
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
              }}
            >
              <span
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 20,
                  color: COLORS.textMuted,
                }}
              >
                {card.name}
              </span>
            </div>
          )}

          {/* Rarity badge — top right corner */}
          <span
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              borderRadius: 6,
              backgroundColor: "rgba(10, 9, 8, 0.85)",
              padding: "4px 10px",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 14,
              letterSpacing: "0.1em",
              color: rarityColor,
            }}
          >
            {card.rarity}
          </span>
        </div>

        {/* Card info below image */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            width: 320,
          }}
        >
          {/* Card name */}
          <h3
            style={{
              margin: 0,
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 32,
              letterSpacing: "0.04em",
              color: COLORS.textPrimary,
              textAlign: "center",
              lineHeight: 1.1,
            }}
          >
            {card.name}
          </h3>

          {/* Type + Rarity label */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 13,
              letterSpacing: "0.12em",
            }}
          >
            <span style={{ color: COLORS.textMuted }}>{typeLabel}</span>
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                backgroundColor: COLORS.border,
                display: "inline-block",
              }}
            />
            <span style={{ color: rarityColor }}>{rarityLabel}</span>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              marginTop: 4,
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 15,
              letterSpacing: "0.08em",
            }}
          >
            <span style={{ color: COLORS.textSecondary }}>
              <span style={{ color: COLORS.textMuted, marginRight: 4 }}>ATK</span>
              {atk}
              {dupeCount > 0 && (
                <span style={{ color: "#4ade80", fontSize: 12, marginLeft: 3 }}>
                  +{dupeCount * 10}%
                </span>
              )}
            </span>
            <span style={{ color: COLORS.textSecondary }}>
              <span style={{ color: COLORS.textMuted, marginRight: 4 }}>DEF</span>
              {def}
              {dupeCount > 0 && (
                <span style={{ color: "#4ade80", fontSize: 12, marginLeft: 3 }}>
                  +{dupeCount * 10}%
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom decorative line + watermark */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 60,
            height: 1,
            backgroundColor: COLORS.border,
          }}
        />
        <span
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 11,
            letterSpacing: "0.2em",
            color: COLORS.textMuted,
            opacity: 0.4,
          }}
        >
          cinegacha
        </span>
      </div>
    </div>
  )
}

/**
 * Capture the share image container as a JPEG and trigger a browser download.
 *
 * Dynamically imports html-to-image to keep it out of the initial bundle.
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
