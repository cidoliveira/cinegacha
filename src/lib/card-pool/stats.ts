/**
 * ATK/DEF stat computation for gacha cards.
 *
 * Stats are derived from real TMDB data, normalized to a 1-999 scale,
 * then amplified by a rarity multiplier. Each card type (movie, actor,
 * director) uses different TMDB fields to compute its base stats.
 */
import { RARITY_TIERS, type RarityTier } from "../rarity/tiers"

// ---------------------------------------------------------------------------
// Normalization utilities
// ---------------------------------------------------------------------------

/**
 * Normalizes a value into the 0-1 range given known min/max bounds.
 * Returns 0.5 if min === max (avoids division by zero).
 */
export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5
  return Math.max(0, Math.min(1, (value - min) / (max - min)))
}

/**
 * Maps a normalized 0-1 value to the 1-999 stat range.
 */
export function toStatRange(normalizedValue: number): number {
  return Math.max(1, Math.min(999, Math.round(normalizedValue * 998 + 1)))
}

// ---------------------------------------------------------------------------
// Card type stat functions
// ---------------------------------------------------------------------------

/**
 * Movie stats:
 * - ATK derived from popularity (normalized across the pool)
 * - DEF derived from vote average (0-10 scale)
 */
export function computeMovieStats(
  popularity: number,
  voteAverage: number,
  poolMinPopularity: number,
  poolMaxPopularity: number
): { baseAtk: number; baseDef: number } {
  const baseAtk = toStatRange(
    normalize(popularity, poolMinPopularity, poolMaxPopularity)
  )
  const baseDef = toStatRange(normalize(voteAverage, 0, 10))
  return { baseAtk, baseDef }
}

/**
 * Actor stats:
 * - ATK derived from popularity (normalized across the pool)
 * - DEF derived from average movie vote average (0-10 scale)
 */
export function computeActorStats(
  popularity: number,
  avgMovieVoteAverage: number,
  poolMinPopularity: number,
  poolMaxPopularity: number
): { baseAtk: number; baseDef: number } {
  const baseAtk = toStatRange(
    normalize(popularity, poolMinPopularity, poolMaxPopularity)
  )
  const baseDef = toStatRange(normalize(avgMovieVoteAverage, 0, 10))
  return { baseAtk, baseDef }
}

/**
 * Director stats:
 * - ATK derived from average directed movie vote average (0-10 scale)
 * - DEF derived from career consistency (ratio of movies with vote_avg > 6.0)
 *
 * careerConsistency is pre-computed as:
 *   (movies with vote_avg > 6.0) / total_directed_movies
 */
export function computeDirectorStats(
  avgDirectedMovieVoteAverage: number,
  careerConsistency: number
): { baseAtk: number; baseDef: number } {
  const baseAtk = toStatRange(
    normalize(avgDirectedMovieVoteAverage, 0, 10)
  )
  const baseDef = toStatRange(normalize(careerConsistency, 0, 1))
  return { baseAtk, baseDef }
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
