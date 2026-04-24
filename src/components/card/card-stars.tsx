/**
 * Filled-only star display for gacha cards.
 *
 * Only shows earned stars (no empty star slots).
 * Stars are gold/yellow. Returns null if count is 0 or below.
 */
export function CardStars({ count }: { count: number }) {
  if (count <= 0) return null

  return (
    <div
      className="flex items-center gap-0.5 text-sm text-yellow-400"
      aria-label={`${count} star${count === 1 ? '' : 's'}`}
    >
      {Array.from({ length: count }, (_, i) => (
        <span key={i} aria-hidden="true">
          ★
        </span>
      ))}
    </div>
  )
}
