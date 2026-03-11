/**
 * Gacha engine constants: pack configuration and pull weights.
 *
 * IMPORTANT: Pull weights are DIFFERENT from pool distribution percentages in rarity/tiers.ts.
 * - Pool distribution (tiers.ts targetPct): determines how many cards of each rarity
 *   exist in the card_pool table (C=30%, UC=25%, R=20%, etc.)
 * - Pull weights (below): probability of rolling each tier when opening a pack
 *   (C=75%, UC=13%, R=7%, etc.)
 *
 * Common cards are more likely to be pulled than their pool proportion, while rare
 * cards are less likely -- the standard gacha pattern.
 */

/** Number of cards per pack */
export const PACK_SIZE = 5

/** Seconds between pack regenerations (1 pack every 2 minutes) */
export const REGEN_SECONDS = 120

/** Maximum packs a user can hold at once */
export const MAX_PACKS = 10

/** SR+ guaranteed after this many consecutive packs without one */
export const PITY_THRESHOLD = 10

/**
 * Pull weights for gacha rolls (percentage chance per card roll).
 * These weights are used in the Postgres RPC function for the two-step
 * weighted random: first roll a rarity tier, then pick a random card
 * from that tier.
 *
 * New distribution: C=75%, UC=13%, R=7%, SR=3%, SSR=1.2%, UR=0.6%, LR=0.2%
 */
export const PULL_WEIGHTS = {
  C: 75,
  UC: 13,
  R: 7,
  SR: 3,
  SSR: 1.2,
  UR: 0.6,
  LR: 0.2,
} as const
