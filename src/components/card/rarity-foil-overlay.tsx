'use client'

import { useReducedMotion } from 'motion/react'
import type { RarityTier } from '@/lib/rarity/tiers'

interface RarityFoilOverlayProps {
  rarity: RarityTier
  context: 'modal' | 'reveal'
}

/**
 * Renders tier-appropriate foil effects as an absolute overlay.
 *
 * Escalation: R silver sweep → SR gold sweep → SSR/UR/LR holographic sweep
 * with increasing intensity. No particles, no mouse tracking — clean sweeps only.
 *
 * C and UC return null (no overlay).
 * Reduced motion: static gradient with no animation.
 */
export function RarityFoilOverlay({ rarity, context }: RarityFoilOverlayProps) {
  const prefersReducedMotion = useReducedMotion()
  void context

  if (rarity === 'C' || rarity === 'UC') return null

  const isStatic = !!prefersReducedMotion

  if (rarity === 'R') {
    return (
      <div
        aria-hidden="true"
        className={isStatic ? '' : 'animate-silver-sweep'}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          background:
            'linear-gradient(105deg, transparent 20%, oklch(85% 0.02 240) 45%, oklch(95% 0.04 240) 50%, oklch(85% 0.02 240) 55%, transparent 80%)',
          backgroundPosition: isStatic ? 'center' : undefined,
          backgroundSize: '200% 100%',
          mixBlendMode: 'overlay',
          opacity: 0.6,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      />
    )
  }

  if (rarity === 'SR') {
    return (
      <div
        aria-hidden="true"
        className={isStatic ? '' : 'animate-gold-sweep'}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          background:
            'linear-gradient(105deg, transparent 20%, oklch(85% 0.12 85) 45%, oklch(95% 0.18 85) 50%, oklch(85% 0.12 85) 55%, transparent 80%)',
          backgroundPosition: isStatic ? 'center' : undefined,
          backgroundSize: '200% 100%',
          mixBlendMode: 'overlay',
          opacity: 0.5,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      />
    )
  }

  // SSR, UR, LR: holographic sweep with escalating intensity
  const holoConfig = {
    SSR: { opacity: 0.35, speed: 'animate-holo-sweep' },
    UR: { opacity: 0.45, speed: 'animate-holo-sweep' },
    LR: { opacity: 0.55, speed: 'animate-holo-sweep' },
  } as const

  const config = holoConfig[rarity as 'SSR' | 'UR' | 'LR']

  return (
    <div
      aria-hidden="true"
      className={isStatic ? '' : config.speed}
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        background:
          'linear-gradient(105deg, transparent 10%, oklch(85% 0.15 0) 25%, oklch(85% 0.15 60) 33%, oklch(85% 0.15 120) 41%, oklch(85% 0.15 180) 49%, oklch(85% 0.15 240) 57%, oklch(85% 0.15 300) 65%, oklch(85% 0.15 360) 75%, transparent 90%)',
        backgroundPosition: isStatic ? 'center' : undefined,
        backgroundSize: '300% 100%',
        mixBlendMode: 'overlay',
        opacity: isStatic ? config.opacity * 0.7 : config.opacity,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    />
  )
}
