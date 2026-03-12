"use client"

import { useEffect, useState } from "react"
import { useReducedMotion } from "motion/react"
import type { RarityTier } from "@/lib/rarity/tiers"

interface RarityFoilOverlayProps {
  rarity: RarityTier
  context: "modal" | "reveal"
}

/** Chromatic foil div shared by SSR, UR, and LR. */
function ChromaticFoil({ isAuto }: { isAuto: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={isAuto ? "animate-foil-shimmer" : ""}
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "inherit",
        background: isAuto
          ? "linear-gradient(105deg, oklch(80% 0.28 0) 0%, oklch(80% 0.28 60) 16.6%, oklch(80% 0.28 120) 33.3%, oklch(80% 0.28 180) 50%, oklch(80% 0.28 240) 66.6%, oklch(80% 0.28 300) 83.3%, oklch(80% 0.28 360) 100%)"
          : "radial-gradient(ellipse at calc(var(--foil-x, 50) * 1%) calc(var(--foil-y, 50) * 1%), oklch(80% 0.28 0), oklch(80% 0.28 60), oklch(80% 0.28 120), oklch(80% 0.28 180), oklch(80% 0.28 240), oklch(80% 0.28 300), oklch(80% 0.28 360))",
        backgroundSize: isAuto ? "300% 100%" : undefined,
        mixBlendMode: "color-dodge",
        opacity: 0.4,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    />
  )
}

/** Static foil texture for reduced-motion users (SSR+). */
function StaticChromaticFoil() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "inherit",
        background:
          "radial-gradient(ellipse at 50% 50%, oklch(80% 0.28 0), oklch(80% 0.28 60), oklch(80% 0.28 120), oklch(80% 0.28 180), oklch(80% 0.28 240), oklch(80% 0.28 300), oklch(80% 0.28 360))",
        mixBlendMode: "color-dodge",
        opacity: 0.3,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    />
  )
}

// Particle positions around card edges (top/left as percentages)
const UR_PARTICLES: Array<{ top?: string; bottom?: string; left?: string; right?: string; size: number; color: string }> = [
  { top: "5%", left: "10%", size: 5, color: "oklch(95% 0.05 85)" },
  { top: "5%", right: "10%", size: 4, color: "oklch(95% 0.02 0)" },
  { top: "30%", right: "3%", size: 6, color: "oklch(95% 0.05 85)" },
  { bottom: "30%", right: "3%", size: 4, color: "oklch(95% 0.02 0)" },
  { bottom: "5%", right: "10%", size: 5, color: "oklch(95% 0.05 85)" },
  { bottom: "5%", left: "10%", size: 4, color: "oklch(95% 0.02 0)" },
  { top: "30%", left: "3%", size: 6, color: "oklch(95% 0.05 85)" },
  { bottom: "30%", left: "3%", size: 4, color: "oklch(95% 0.02 0)" },
]

const LR_PARTICLES: Array<{ top?: string; bottom?: string; left?: string; right?: string; size: number; color: string; animType: "float" | "fade" }> = [
  { top: "3%", left: "8%", size: 5, color: "oklch(95% 0.02 0)", animType: "float" },
  { top: "3%", left: "30%", size: 3, color: "oklch(90% 0.12 85)", animType: "fade" },
  { top: "3%", right: "8%", size: 5, color: "oklch(95% 0.05 85)", animType: "float" },
  { top: "20%", right: "3%", size: 6, color: "oklch(95% 0.02 0)", animType: "float" },
  { top: "45%", right: "3%", size: 4, color: "oklch(90% 0.12 340)", animType: "fade" },
  { bottom: "20%", right: "3%", size: 7, color: "oklch(95% 0.05 85)", animType: "float" },
  { bottom: "3%", right: "8%", size: 4, color: "oklch(95% 0.02 0)", animType: "fade" },
  { bottom: "3%", left: "30%", size: 5, color: "oklch(90% 0.12 85)", animType: "float" },
  { bottom: "3%", left: "8%", size: 3, color: "oklch(95% 0.05 85)", animType: "fade" },
  { bottom: "20%", left: "3%", size: 6, color: "oklch(95% 0.02 0)", animType: "float" },
  { top: "45%", left: "3%", size: 4, color: "oklch(90% 0.12 340)", animType: "fade" },
  { top: "20%", left: "3%", size: 5, color: "oklch(95% 0.05 85)", animType: "float" },
  // Over-card-face particles
  { top: "35%", left: "20%", size: 4, color: "oklch(90% 0.12 85)", animType: "fade" },
  { top: "55%", right: "20%", size: 3, color: "oklch(90% 0.12 340)", animType: "fade" },
]

/**
 * Renders tier-appropriate foil effects as an absolute overlay.
 *
 * Three rendering modes:
 *   mouse   - desktop with motion OK: chromatic foil driven by --foil-x/--foil-y CSS vars
 *   auto    - touch device with motion OK: animated sweeping foil
 *   static  - reduced motion: fixed foil texture with no animation
 *
 * C and UC return null (no overlay).
 */
export function RarityFoilOverlay({ rarity, context: _context }: RarityFoilOverlayProps) {
  const prefersReducedMotion = useReducedMotion()
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    setIsTouch(window.matchMedia("(hover: none)").matches)
  }, [])

  // C and UC: no foil
  if (rarity === "C" || rarity === "UC") return null

  // Reduced motion: static texture only
  if (prefersReducedMotion) {
    if (rarity === "R") {
      return (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            background:
              "linear-gradient(105deg, transparent 20%, oklch(85% 0.02 240) 45%, oklch(95% 0.04 240) 50%, oklch(85% 0.02 240) 55%, transparent 80%)",
            backgroundPosition: "center",
            backgroundSize: "200% 100%",
            mixBlendMode: "overlay",
            opacity: 0.6,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        />
      )
    }
    if (rarity === "SR") {
      return (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            background:
              "linear-gradient(105deg, transparent 20%, oklch(85% 0.12 85) 45%, oklch(95% 0.18 85) 50%, oklch(85% 0.12 85) 55%, transparent 80%)",
            backgroundPosition: "center",
            backgroundSize: "200% 100%",
            mixBlendMode: "overlay",
            opacity: 0.5,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        />
      )
    }
    // SSR, UR, LR: static chromatic
    if (rarity === "SSR") return <StaticChromaticFoil />
    if (rarity === "UR") {
      return (
        <>
          <StaticChromaticFoil />
          {UR_PARTICLES.map((p, i) => (
            <span
              key={i}
              aria-hidden="true"
              style={{
                position: "absolute",
                top: p.top,
                bottom: p.bottom,
                left: p.left,
                right: p.right,
                width: p.size,
                height: p.size,
                borderRadius: "50%",
                background: p.color,
                opacity: 0.7,
                pointerEvents: "none",
              }}
            />
          ))}
        </>
      )
    }
    // LR static
    return (
      <>
        <StaticChromaticFoil />
        {LR_PARTICLES.map((p, i) => (
          <span
            key={i}
            aria-hidden="true"
            style={{
              position: "absolute",
              top: p.top,
              bottom: p.bottom,
              left: p.left,
              right: p.right,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: p.color,
              opacity: 0.7,
              pointerEvents: "none",
            }}
          />
        ))}
      </>
    )
  }

  // Motion OK -- R
  if (rarity === "R") {
    return (
      <div
        aria-hidden="true"
        className="animate-silver-sweep"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          background:
            "linear-gradient(105deg, transparent 20%, oklch(85% 0.02 240) 45%, oklch(95% 0.04 240) 50%, oklch(85% 0.02 240) 55%, transparent 80%)",
          backgroundSize: "200% 100%",
          mixBlendMode: "overlay",
          opacity: 0.6,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      />
    )
  }

  // Motion OK -- SR
  if (rarity === "SR") {
    return (
      <div
        aria-hidden="true"
        className="animate-gold-sweep"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          background:
            "linear-gradient(105deg, transparent 20%, oklch(85% 0.12 85) 45%, oklch(95% 0.18 85) 50%, oklch(85% 0.12 85) 55%, transparent 80%)",
          backgroundSize: "200% 100%",
          mixBlendMode: "overlay",
          opacity: 0.5,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      />
    )
  }

  // Motion OK -- SSR
  if (rarity === "SSR") {
    return <ChromaticFoil isAuto={isTouch} />
  }

  // Motion OK -- UR
  if (rarity === "UR") {
    return (
      <>
        <ChromaticFoil isAuto={isTouch} />
        {UR_PARTICLES.map((p, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="animate-sparkle-float"
            style={{
              position: "absolute",
              top: p.top,
              bottom: p.bottom,
              left: p.left,
              right: p.right,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: p.color,
              pointerEvents: "none",
              animationDelay: `${i * 0.35}s`,
            }}
          />
        ))}
      </>
    )
  }

  // Motion OK -- LR
  return (
    <>
      <ChromaticFoil isAuto={isTouch} />
      {LR_PARTICLES.map((p, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={p.animType === "float" ? "animate-sparkle-float" : "animate-sparkle-fade"}
          style={{
            position: "absolute",
            top: p.top,
            bottom: p.bottom,
            left: p.left,
            right: p.right,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: p.color,
            pointerEvents: "none",
            animationDelay: `${i * 0.28}s`,
          }}
        />
      ))}
    </>
  )
}
