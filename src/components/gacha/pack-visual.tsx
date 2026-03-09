"use client"

import { useAnimate } from "motion/react"

interface PackVisualProps {
  onTearComplete: () => void
}

/**
 * TCG booster pack visual with tear animation.
 *
 * Renders a foil-wrapped booster pack using CSS gradients.
 * On click/tap, the pack scales up slightly for anticipation,
 * then splits into top and bottom halves that slide apart and fade.
 * Calls onTearComplete when the tear sequence finishes.
 *
 * Uses useAnimate from Motion for imperative sequential animation.
 * Only animates transform and opacity -- no layout-triggering properties.
 */
export function PackVisual({ onTearComplete }: PackVisualProps) {
  const [scope, animate] = useAnimate()

  async function handleTear() {
    // Anticipation: pack scales up slightly
    await animate(
      scope.current,
      { scale: 1.03 },
      { duration: 0.15, ease: "easeOut" },
    )

    // Split: top slides up + fades, bottom slides down + fades
    await Promise.all([
      animate(
        ".pack-top",
        { y: "-110%", opacity: 0 },
        { duration: 0.35, ease: "easeIn" },
      ),
      animate(
        ".pack-bottom",
        { y: "110%", opacity: 0 },
        { duration: 0.35, ease: "easeIn" },
      ),
    ])

    onTearComplete()
  }

  return (
    <button
      ref={scope}
      type="button"
      onClick={handleTear}
      className="group relative cursor-pointer focus-visible:outline-none"
      aria-label="Open booster pack"
      style={{ transform: "scale(1)" }}
    >
      {/* Top half */}
      <div
        className="pack-top pointer-events-none absolute inset-0"
        style={{ clipPath: "inset(0 0 50% 0)" }}
        aria-hidden="true"
      >
        <PackFace />
      </div>

      {/* Bottom half */}
      <div
        className="pack-bottom pointer-events-none absolute inset-0"
        style={{ clipPath: "inset(50% 0 0 0)" }}
        aria-hidden="true"
      >
        <PackFace />
      </div>

      {/* Base layer (provides layout sizing) */}
      <div className="invisible" aria-hidden="true">
        <PackFace />
      </div>
    </button>
  )
}

/**
 * The visual face of the booster pack.
 *
 * CSS-only foil wrapper with metallic gradient, tear line hint,
 * film-strip decorative borders, and CineGacha branding.
 */
function PackFace() {
  return (
    <div
      className="relative flex h-[280px] w-[200px] flex-col items-center justify-center overflow-hidden rounded-xl border border-border-subtle"
      style={{
        background: `
          linear-gradient(
            135deg,
            #1a1a1a 0%,
            #2a2a2a 20%,
            #1f1f1f 40%,
            #333333 50%,
            #1a1a1a 60%,
            #2a2a2a 80%,
            #1f1f1f 100%
          )
        `,
      }}
    >
      {/* Foil sheen overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background: `
            linear-gradient(
              160deg,
              transparent 30%,
              rgba(220, 38, 38, 0.15) 45%,
              rgba(220, 38, 38, 0.08) 55%,
              transparent 70%
            )
          `,
        }}
      />

      {/* Film-strip decorative edge (left) */}
      <div className="absolute top-4 bottom-4 left-3 w-3 opacity-20">
        <div className="flex h-full flex-col justify-between">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-2 w-3 rounded-sm bg-text-muted"
            />
          ))}
        </div>
      </div>

      {/* Film-strip decorative edge (right) */}
      <div className="absolute top-4 right-3 bottom-4 w-3 opacity-20">
        <div className="flex h-full flex-col justify-between">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-2 w-3 rounded-sm bg-text-muted"
            />
          ))}
        </div>
      </div>

      {/* Pack branding */}
      <span className="font-display relative z-10 text-3xl tracking-widest text-accent opacity-80">
        CineGacha
      </span>

      {/* Subtitle */}
      <span className="font-body relative z-10 mt-1 text-[10px] tracking-[0.3em] text-text-muted uppercase">
        Booster Pack
      </span>

      {/* Tear line hint */}
      <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2">
        <div className="border-t border-dashed border-text-muted/30" />
      </div>

      {/* Tap hint */}
      <span className="absolute bottom-5 text-[10px] text-text-muted opacity-0 transition-opacity group-hover:opacity-60">
        Tap to open
      </span>
    </div>
  )
}
