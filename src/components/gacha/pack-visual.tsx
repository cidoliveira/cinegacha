"use client"

import { useAnimate } from "motion/react"

interface PackVisualProps {
  onTearComplete: () => void
}

/**
 * TCG booster pack visual with tear animation.
 *
 * Renders a foil-wrapped booster pack inspired by Wikigacha's physical bag look.
 * Silver/metallic pouch shape with zigzag crimped seals, prominent against dark bg.
 * On click/tap, scales up then splits into top/bottom halves that slide apart.
 */
export function PackVisual({ onTearComplete }: PackVisualProps) {
  const [scope, animate] = useAnimate()

  async function handleTear() {
    await animate(
      scope.current,
      { scale: 1.03 },
      { duration: 0.15, ease: "easeOut" },
    )

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
        style={{ clipPath: "inset(0 0 49.5% 0)" }}
        aria-hidden="true"
      >
        <PackFace />
      </div>

      {/* Bottom half */}
      <div
        className="pack-bottom pointer-events-none absolute inset-0"
        style={{ clipPath: "inset(49.5% 0 0 0)" }}
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
 * Silver metallic pouch with:
 * - Zigzag crimped seals (top/bottom) via clip-path
 * - Layered metallic gradients for foil look
 * - Animated diagonal sheen sweep
 * - CineGacha branding with emboss effect
 * - High contrast against dark background
 */
function PackFace() {
  return (
    <div
      className="relative flex h-[380px] w-[220px] flex-col items-center justify-center overflow-hidden"
      style={{
        clipPath: `polygon(${Array.from({ length: 26 }, (_, i) => {
          const x = (i / 25) * 100
          const y = i % 2 === 0 ? 0 : 3
          return `${x}% ${y}%`
        }).join(", ")}, ${Array.from({ length: 26 }, (_, i) => {
          const x = 100 - (i / 25) * 100
          const y = i % 2 === 0 ? 100 : 97
          return `${x}% ${y}%`
        }).join(", ")})`,
        background: `
          linear-gradient(
            175deg,
            #c8c0b8 0%,
            #a8a098 8%,
            #d8d0c8 18%,
            #b0a89e 30%,
            #c0b8b0 42%,
            #a09890 52%,
            #c8c0b8 62%,
            #b8b0a6 74%,
            #d0c8c0 86%,
            #a8a098 100%
          )
        `,
      }}
    >
      {/* Secondary metallic gradient layer -- adds depth */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: `
            linear-gradient(
              90deg,
              transparent 0%,
              rgba(255,255,255,0.3) 15%,
              transparent 30%,
              rgba(255,255,255,0.15) 50%,
              transparent 65%,
              rgba(255,255,255,0.25) 85%,
              transparent 100%
            )
          `,
        }}
      />

      {/* Animated foil sheen -- diagonal light sweep */}
      <div
        className="pointer-events-none absolute inset-0 animate-pack-sheen"
        style={{
          backgroundImage: `
            linear-gradient(
              125deg,
              transparent 20%,
              rgba(255, 255, 255, 0.08) 35%,
              rgba(255, 255, 255, 0.2) 45%,
              rgba(255, 255, 255, 0.35) 50%,
              rgba(255, 255, 255, 0.2) 55%,
              rgba(255, 255, 255, 0.08) 65%,
              transparent 80%
            )
          `,
          backgroundSize: "300% 300%",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Subtle crinkle/grain texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Central branding area */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        {/* Logo -- dark embossed on light foil */}
        <span
          className="font-display text-[32px] italic leading-none"
          style={{
            background: "linear-gradient(180deg, #3a3530 0%, #1a1815 40%, #3a3530 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 1px 0px rgba(255,255,255,0.15))",
          }}
        >
          CineGacha
        </span>

        {/* Subtitle */}
        <span
          className="text-[9px] font-medium tracking-[0.3em] uppercase"
          style={{ color: "rgba(50, 45, 40, 0.5)" }}
        >
          Booster Pack
        </span>
      </div>

      {/* Tap hint */}
      <span
        className="absolute bottom-[15%] text-[9px] font-medium tracking-[0.15em] uppercase opacity-0 transition-opacity group-hover:opacity-100"
        style={{ color: "rgba(50, 45, 40, 0.4)" }}
      >
        tap to open
      </span>
    </div>
  )
}
