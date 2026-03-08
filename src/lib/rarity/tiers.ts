/**
 * Rarity tier definitions for the gacha card system.
 *
 * targetPct: desired distribution percentage for each tier
 * multiplier: stat multiplier applied to ATK/DEF for cards of this tier
 */
export const RARITY_TIERS = {
  C: { label: "Common", targetPct: 0.3, multiplier: 1.0 },
  UC: { label: "Uncommon", targetPct: 0.25, multiplier: 1.15 },
  R: { label: "Rare", targetPct: 0.2, multiplier: 1.35 },
  SR: { label: "Super Rare", targetPct: 0.12, multiplier: 1.6 },
  SSR: { label: "Super Super Rare", targetPct: 0.08, multiplier: 2.0 },
  UR: { label: "Ultra Rare", targetPct: 0.035, multiplier: 2.5 },
  LR: { label: "Legendary Rare", targetPct: 0.015, multiplier: 3.2 },
} as const

export type RarityTier = keyof typeof RARITY_TIERS

/**
 * Cumulative percentile breakpoints for tier assignment.
 *
 * Entities are sorted by rarity score ascending (lowest = most common).
 * An entity at percentile p gets the first tier where p <= maxPercentile.
 *
 * C:   bottom 30%
 * UC:  next 25%  (cumulative 55%)
 * R:   next 20%  (cumulative 75%)
 * SR:  next 12%  (cumulative 87%)
 * SSR: next 8%   (cumulative 95%)
 * UR:  next 3.5% (cumulative 98.5%)
 * LR:  top 1.5%  (cumulative 100%)
 */
export const PERCENTILE_BREAKPOINTS: ReadonlyArray<{
  tier: RarityTier
  maxPercentile: number
}> = [
  { tier: "C", maxPercentile: 0.3 },
  { tier: "UC", maxPercentile: 0.55 },
  { tier: "R", maxPercentile: 0.75 },
  { tier: "SR", maxPercentile: 0.87 },
  { tier: "SSR", maxPercentile: 0.95 },
  { tier: "UR", maxPercentile: 0.985 },
  { tier: "LR", maxPercentile: 1.0 },
]
