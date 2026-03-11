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
 * Movie rarity score: popularity (log-scaled) weighted 30%, vote average 70%.
 * Quality-first: critically acclaimed films rank higher than viral mediocre ones.
 */
export function computeMovieRarityScore(
  popularity: number,
  voteAverage: number
): number {
  return Math.log10(popularity + 1) * 0.3 + voteAverage * 0.7
}

/**
 * Actor rarity score: popularity 15%, average movie vote 55%, career breadth 30%.
 * Quality-first: actors in great films rank high regardless of mainstream fame.
 */
export function computeActorRarityScore(
  popularity: number,
  avgMovieVote: number,
  movieCreditCount: number
): number {
  const careerBreadth = Math.min(movieCreditCount / 20, 1.0) * 10
  return (
    Math.log10(popularity + 1) * 0.15 +
    avgMovieVote * 0.55 +
    careerBreadth * 0.3
  )
}

/**
 * Director rarity score: popularity 25%, average movie vote 45%, career breadth 30%.
 * Directors weight quality highest: acclaimed filmography over mainstream fame.
 */
export function computeDirectorRarityScore(
  popularity: number,
  avgMovieVote: number,
  movieCreditCount: number
): number {
  const careerBreadth = Math.min(movieCreditCount / 20, 1.0) * 10
  return (
    Math.log10(popularity + 1) * 0.25 +
    avgMovieVote * 0.45 +
    careerBreadth * 0.3
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
