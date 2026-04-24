/**
 * Composite rarity score computation and percentile-based tier assignment.
 *
 * Each card type (movie, actor, director) has a distinct formula that
 * combines TMDB metrics into a single rarity score. Scores are then
 * ranked and assigned tiers based on cumulative percentile breakpoints,
 * guaranteeing the target distribution regardless of score shape.
 */
import { PERCENTILE_BREAKPOINTS, type RarityTier } from './tiers'

// ---------------------------------------------------------------------------
// Composite score functions
// ---------------------------------------------------------------------------

/**
 * Movie rarity score: popularity 20%, vote average 50%, vote count (recognition) 30%.
 * Vote count measures global recognition — widely-seen quality films rank highest.
 * Log10 scales both popularity and vote_count to tame power-law distributions.
 */
export function computeMovieRarityScore(
  popularity: number,
  voteAverage: number,
  voteCount: number
): number {
  return Math.log10(popularity + 1) * 0.2 + voteAverage * 0.5 + Math.log10(voteCount + 1) * 0.3
}

/**
 * Actor rarity score: popularity 10%, avg movie vote 40%, recognition 30%, career breadth 20%.
 * Recognition = log10 sum of vote counts across top credits (how widely seen their films are).
 */
export function computeActorRarityScore(
  popularity: number,
  avgMovieVote: number,
  movieCreditCount: number,
  totalVoteCount: number
): number {
  const careerBreadth = Math.min(movieCreditCount / 20, 1.0) * 10
  return (
    Math.log10(popularity + 1) * 0.1 +
    avgMovieVote * 0.4 +
    Math.log10(totalVoteCount + 1) * 0.3 +
    careerBreadth * 0.2
  )
}

/**
 * Director rarity score: popularity 10%, avg movie vote 40%, recognition 30%, career breadth 20%.
 * Same recognition signal as actors — acclaimed + widely-seen filmography ranks highest.
 */
export function computeDirectorRarityScore(
  popularity: number,
  avgMovieVote: number,
  movieCreditCount: number,
  totalVoteCount: number
): number {
  const careerBreadth = Math.min(movieCreditCount / 20, 1.0) * 10
  return (
    Math.log10(popularity + 1) * 0.1 +
    avgMovieVote * 0.4 +
    Math.log10(totalVoteCount + 1) * 0.3 +
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
export function assignRarityTiers<T extends { id: string; rarityScore: number }>(
  entities: T[]
): (T & { rarity: RarityTier })[] {
  const sorted = [...entities].sort((a, b) => a.rarityScore - b.rarityScore)
  const total = sorted.length

  return sorted.map((entity, index) => {
    const percentile = (index + 1) / total

    const breakpoint = PERCENTILE_BREAKPOINTS.find((bp) => percentile <= bp.maxPercentile)

    return {
      ...entity,
      rarity: breakpoint ? breakpoint.tier : ('C' as RarityTier),
    }
  })
}
