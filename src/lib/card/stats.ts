/**
 * Compute effective stats with star bonus multiplier.
 *
 * Stars range 0-4 in the database (display 1-5).
 * Each star adds 10% to base stats: 0 stars = 1.0x, 4 stars = 1.4x.
 */
export function computeEffectiveStats(
  baseAtk: number,
  baseDef: number,
  stars: number
): { atk: number; def: number; displayStars: number } {
  const multiplier = 1 + stars * 0.1
  return {
    atk: Math.round(baseAtk * multiplier),
    def: Math.round(baseDef * multiplier),
    displayStars: stars + 1,
  }
}
