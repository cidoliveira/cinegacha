/**
 * ATK / DEF stat display for gacha cards.
 *
 * Uses Bebas Neue (font-display) for the numbers.
 * Expects effective stats (already including star bonus).
 */
export function CardStats({ atk, def }: { atk: number; def: number }) {
  return (
    <div className="flex items-center gap-3 font-display text-sm tracking-wider">
      <span className="text-text-secondary">
        <span className="text-text-muted">ATK</span> {atk}
      </span>
      <span className="text-text-secondary">
        <span className="text-text-muted">DEF</span> {def}
      </span>
    </div>
  )
}
