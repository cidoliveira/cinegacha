/**
 * Rarity tier definitions for the gacha card system.
 *
 * targetPct: desired distribution percentage for each tier
 * multiplier: stat multiplier applied to ATK/DEF for cards of this tier
 */
export const RARITY_TIERS = {
  C: { label: "Common", targetPct: 0.4, multiplier: 1.0 },
  UC: { label: "Uncommon", targetPct: 0.25, multiplier: 1.15 },
  R: { label: "Rare", targetPct: 0.18, multiplier: 1.35 },
  SR: { label: "Super Rare", targetPct: 0.1, multiplier: 1.6 },
  SSR: { label: "Super Super Rare", targetPct: 0.05, multiplier: 2.0 },
  UR: { label: "Ultra Rare", targetPct: 0.015, multiplier: 2.5 },
  LR: { label: "Legendary Rare", targetPct: 0.005, multiplier: 3.2 },
} as const

export type RarityTier = keyof typeof RARITY_TIERS

/**
 * Cumulative percentile breakpoints for tier assignment.
 *
 * Entities are sorted by rarity score ascending (lowest = most common).
 * An entity at percentile p gets the first tier where p <= maxPercentile.
 *
 * C:   bottom 40%
 * UC:  next 25%  (cumulative 65%)
 * R:   next 18%  (cumulative 83%)
 * SR:  next 10%  (cumulative 93%)
 * SSR: next 5%   (cumulative 98%)
 * UR:  next 1.5% (cumulative 99.5%)
 * LR:  top 0.5%  (cumulative 100%)
 */
export const PERCENTILE_BREAKPOINTS: ReadonlyArray<{
  tier: RarityTier
  maxPercentile: number
}> = [
  { tier: "C", maxPercentile: 0.4 },
  { tier: "UC", maxPercentile: 0.65 },
  { tier: "R", maxPercentile: 0.83 },
  { tier: "SR", maxPercentile: 0.93 },
  { tier: "SSR", maxPercentile: 0.98 },
  { tier: "UR", maxPercentile: 0.995 },
  { tier: "LR", maxPercentile: 1.0 },
]
