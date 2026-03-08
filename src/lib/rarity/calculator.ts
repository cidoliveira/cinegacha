/**
 * Composite rarity score computation and percentile-based tier assignment.
 *
 * Each card type (movie, actor, director) has a distinct formula that
 * combines TMDB metrics into a single rarity score. Scores are then
 * ranked and assigned tiers based on cumulative percentile breakpoints,
 * guaranteeing the target distribution regardless of score shape.
 */
import { PERCENTILE_BREAKPOINTS, type RarityTier } from "./tiers"

// ---------------------------------------------------------------------------
// Composite score functions
// ---------------------------------------------------------------------------

/**
 * Movie rarity score: popularity (log-scaled) weighted 60%, vote average 40%.
 * Log10 tames TMDB's power-law popularity distribution.
 */
export function computeMovieRarityScore(
  popularity: number,
  voteAverage: number
): number {
  return Math.log10(popularity + 1) * 0.6 + voteAverage * 0.4
}

/**
 * Actor rarity score: popularity 50%, average movie vote 30%, career breadth 20%.
 * Career breadth = min(movieCreditCount / 20, 1) scaled to 0-10 range.
 */
export function computeActorRarityScore(
  popularity: number,
  avgMovieVote: number,
  movieCreditCount: number
): number {
  const careerBreadth = Math.min(movieCreditCount / 20, 1.0) * 10
  return (
    Math.log10(popularity + 1) * 0.5 +
    avgMovieVote * 0.3 +
    careerBreadth * 0.2
  )
}

/**
 * Director rarity score: popularity 40%, average movie vote 40%, career breadth 20%.
 * Directors weight quality higher than actors (0.4 vs 0.3 for vote average).
 */
export function computeDirectorRarityScore(
  popularity: number,
  avgMovieVote: number,
  movieCreditCount: number
): number {
  const careerBreadth = Math.min(movieCreditCount / 20, 1.0) * 10
  return (
    Math.log10(popularity + 1) * 0.4 +
    avgMovieVote * 0.4 +
    careerBreadth * 0.2
  )
}

// ---------------------------------------------------------------------------
// Tier assignment
// ---------------------------------------------------------------------------

/**
 * Assigns rarity tiers to a list of entities based on their percentile
 * position within the sorted score distribution.
 *
 * - Entities are sorted by rarityScore ascending (lowest = most common).
 * - Each entity's percentile is (index + 1) / total.
 * - The first breakpoint where percentile <= maxPercentile determines the tier.
 */
export function assignRarityTiers<
  T extends { id: string; rarityScore: number },
>(entities: T[]): (T & { rarity: RarityTier })[] {
  const sorted = [...entities].sort((a, b) => a.rarityScore - b.rarityScore)
  const total = sorted.length

  return sorted.map((entity, index) => {
    const percentile = (index + 1) / total

    const breakpoint = PERCENTILE_BREAKPOINTS.find(
      (bp) => percentile <= bp.maxPercentile
    )

    return {
      ...entity,
      rarity: breakpoint ? breakpoint.tier : ("C" as RarityTier),
    }
  })
}
