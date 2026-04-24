const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/'

/**
 * Type-aware TMDB image size presets.
 * Movies use poster widths, people use profile sizes.
 */
export const CARD_IMAGE_SIZES = {
  /** Card thumbnail */
  sm: { movie: 'w342', person: 'w185' },
  /** Pack reveal */
  md: { movie: 'w500', person: 'w185' },
  /** Detail modal */
  lg: { movie: 'w780', person: 'original' },
} as const

type ImageSize = keyof typeof CARD_IMAGE_SIZES
type CardType = 'movie' | 'actor' | 'director'

/**
 * Build a TMDB image URL using the correct size for the card type.
 *
 * Actors and directors both use the "person" size key.
 * Returns null if imagePath is null.
 */
export function cardImageUrl(
  imagePath: string | null,
  cardType: CardType,
  size: ImageSize = 'md'
): string | null {
  if (imagePath === null) return null

  const sizeKey = cardType === 'movie' ? 'movie' : 'person'
  const sizeValue = CARD_IMAGE_SIZES[size][sizeKey]

  return `${TMDB_IMAGE_BASE}${sizeValue}${imagePath}`
}
