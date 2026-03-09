/**
 * Compute effective stats with duplicate bonus multiplier.
 *
 * Stars range 0-4 in the database (duplicate count).
 * Each duplicate adds 10% to base stats: 0 dupes = 1.0x, 4 dupes = 1.4x.
 * Handles undefined/null stars gracefully (defaults to 0).
 */
export function computeEffectiveStats(
  baseAtk: number,
  baseDef: number,
  stars?: number | null
): { atk: number; def: number; dupeCount: number } {
  const safeStars = stars ?? 0
  const multiplier = 1 + safeStars * 0.1
  return {
    atk: Math.round((baseAtk || 0) * multiplier),
    def: Math.round((baseDef || 0) * multiplier),
    dupeCount: safeStars,
  }
}
