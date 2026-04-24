'use client'

import { motion } from 'motion/react'
import type { PulledCard } from '@/lib/gacha/types'
import { RarityFoilOverlay } from '@/components/card/rarity-foil-overlay'

interface CardRevealSlotProps {
  card: PulledCard
  children: React.ReactNode
}

/** Rarities that receive a glow pre-cue flash before card reveal */
const GLOW_RARITIES = new Set<PulledCard['rarity']>(['SR', 'SSR', 'UR', 'LR'])

/**
 * Glow configuration per rarity tier.
 *
 * - `spread`: box-shadow spread (escalating intensity)
 * - `keyframes`: opacity keyframes [start, peak, settle]
 *   SR flashes and disappears (settle = 0).
 *   SSR/UR/LR flash and retain a persistent glow of increasing strength.
 * - `times`: keyframe timing -- peak at 40% of duration
 */
const GLOW_CONFIG: Record<string, { spread: string; keyframes: number[]; times: number[] }> = {
  SR: {
    spread: '0 0 12px 2px',
    keyframes: [0, 0.7, 0],
    times: [0, 0.4, 1],
  },
  SSR: {
    spread: '0 0 15px 3px',
    keyframes: [0, 0.8, 0.3],
    times: [0, 0.4, 1],
  },
  UR: {
    spread: '0 0 25px 6px',
    keyframes: [0, 0.8, 0.5],
    times: [0, 0.4, 1],
  },
  LR: {
    spread: '0 0 40px 10px',
    keyframes: [0, 0.9, 0.7],
    times: [0, 0.4, 1],
  },
}

/**
 * Single card slot with optional rarity glow pre-cue, persistent glow, and foil overlay.
 *
 * SR+ cards get a colored glow flash that peaks early (40% of duration).
 * SSR/UR/LR cards retain an escalating persistent glow after the flash.
 * All R+ cards get a RarityFoilOverlay (C/UC return null internally).
 * C/UC/R cards receive no glow but do get the foil overlay via the component.
 *
 * Only opacity is animated -- box-shadow is static for GPU safety.
 */
export function CardRevealSlot({ card, children }: CardRevealSlotProps) {
  if (!GLOW_RARITIES.has(card.rarity)) {
    return (
      <div className="relative">
        {children}
        <RarityFoilOverlay rarity={card.rarity} context="reveal" />
      </div>
    )
  }

  const config = GLOW_CONFIG[card.rarity]
  const rarityColor = `var(--color-rarity-${card.rarity.toLowerCase()})`

  return (
    <div className="relative">
      {/* Glow layer -- rendered first so it sits behind the card */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-lg"
        style={{
          boxShadow: `${config.spread} ${rarityColor}`,
        }}
        initial={{ opacity: 0 }}
        animate={{
          opacity: config.keyframes,
        }}
        transition={{
          duration: 0.5,
          times: config.times,
          ease: 'easeOut',
        }}
      />

      {/* Card content -- on top of glow */}
      <div className="relative">
        {children}
        <RarityFoilOverlay rarity={card.rarity} context="reveal" />
      </div>
    </div>
  )
}
