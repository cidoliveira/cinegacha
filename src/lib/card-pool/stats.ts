/**
 * ATK/DEF stat computation for gacha cards.
 *
 * Both stats blend two signals — reach (popularity/cultural impact) and
 * quality (critical acclaim). Signals are converted to percentile ranks
 * within each card-type pool so both distributions are uniform, ensuring
 * cards can naturally be "attackers" or "defenders" depending on their
 * relative strengths.
 *
 * ATK = 0.6 × reach_percentile + 0.4 × quality_percentile
 * DEF = 0.4 × reach_percentile + 0.6 × quality_percentile
 */
import { RARITY_TIERS, type RarityTier } from '../rarity/tiers'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ATK_REACH_WEIGHT = 0.6
const ATK_QUALITY_WEIGHT = 0.4
const DEF_REACH_WEIGHT = 0.4
const DEF_QUALITY_WEIGHT = 0.6

// ---------------------------------------------------------------------------
// Percentile ranking
// ---------------------------------------------------------------------------

/**
 * Converts raw values to percentile ranks (0-1, uniformly distributed).
 * Ties receive the average rank. Handles pools of size 0 and 1.
 */
export function toPercentileRanks(values: number[]): number[] {
  const n = values.length
  if (n === 0) return []
  if (n === 1) return [0.5]

  const indexed = values.map((v, i) => ({ v, i }))
  indexed.sort((a, b) => a.v - b.v)

  const ranks = new Array<number>(n)
  let i = 0
  while (i < n) {
    let j = i
    while (j < n && indexed[j].v === indexed[i].v) j++
    const avgRank = (i + j - 1) / 2
    for (let k = i; k < j; k++) {
      ranks[indexed[k].i] = avgRank / (n - 1)
    }
    i = j
  }
  return ranks
}

// ---------------------------------------------------------------------------
// Stat computation
// ---------------------------------------------------------------------------

/**
 * Maps a normalized 0-1 value to the 1-999 stat range.
 */
export function toStatRange(normalizedValue: number): number {
  return Math.max(1, Math.min(999, Math.round(normalizedValue * 998 + 1)))
}

/**
 * Blends percentile-ranked reach and quality into base ATK/DEF.
 */
export function blendToStats(
  reachPct: number,
  qualityPct: number
): { baseAtk: number; baseDef: number } {
  const atkNorm = ATK_REACH_WEIGHT * reachPct + ATK_QUALITY_WEIGHT * qualityPct
  const defNorm = DEF_REACH_WEIGHT * reachPct + DEF_QUALITY_WEIGHT * qualityPct
  return {
    baseAtk: toStatRange(atkNorm),
    baseDef: toStatRange(defNorm),
  }
}

/**
 * Computes ATK/DEF for an entire pool of cards at once.
 * Takes parallel arrays of raw reach and quality values,
 * converts to percentile ranks, then blends into stats.
 */
export function computePoolStats(
  reachValues: number[],
  qualityValues: number[]
): { baseAtk: number; baseDef: number }[] {
  const reachPcts = toPercentileRanks(reachValues)
  const qualityPcts = toPercentileRanks(qualityValues)
  return reachPcts.map((r, i) => blendToStats(r, qualityPcts[i]))
}

// ---------------------------------------------------------------------------
// Rarity multiplier application
// ---------------------------------------------------------------------------

/**
 * Applies the rarity tier multiplier to base stats, clamping to 1-999.
 */
export function applyRarityMultiplier(
  baseAtk: number,
  baseDef: number,
  rarity: RarityTier
): { atk: number; def: number } {
  const { multiplier } = RARITY_TIERS[rarity]
  const atk = Math.max(1, Math.min(999, Math.round(baseAtk * multiplier)))
  const def = Math.max(1, Math.min(999, Math.round(baseDef * multiplier)))
  return { atk, def }
}
