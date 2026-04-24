/**
 * Album seeding -- populates the albums table from card_pool genre metadata.
 *
 * Reads all movie cards from card_pool, groups them by TMDB genre_id,
 * and upserts genre-based album rows for qualifying genres (5+ movies).
 */
import { createAdminClient } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// TMDB genre ID to human-readable name mapping
// ---------------------------------------------------------------------------

const TMDB_GENRE_NAMES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
}

const MIN_CARDS_PER_ALBUM = 5

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SeedAlbumsResult {
  albumCount: number
  albums: Array<{ name: string; cardCount: number }>
}

// ---------------------------------------------------------------------------
// seedAlbums
// ---------------------------------------------------------------------------

export async function seedAlbums(): Promise<SeedAlbumsResult> {
  const supabase = createAdminClient()

  console.log('[albums] Querying movie cards from card_pool...')

  // Fetch all movie cards with their metadata (contains genre_ids)
  const { data: movieCards, error: fetchError } = await supabase
    .from('card_pool')
    .select('id, metadata')
    .eq('card_type', 'movie')

  if (fetchError) {
    throw new Error(`Failed to query card_pool: ${fetchError.message}`)
  }

  if (!movieCards || movieCards.length === 0) {
    throw new Error('No movie cards found in card_pool. Run seed first.')
  }

  console.log(`[albums] Found ${movieCards.length} movie cards`)

  // ---------------------------------------------------------------------------
  // Group card IDs by genre_id
  // ---------------------------------------------------------------------------

  const genreCardMap = new Map<number, string[]>()

  for (const card of movieCards) {
    const meta = card.metadata as unknown as { genre_ids?: number[] }
    const genreIds = meta?.genre_ids ?? []

    for (const genreId of genreIds) {
      if (!genreCardMap.has(genreId)) {
        genreCardMap.set(genreId, [])
      }
      genreCardMap.get(genreId)!.push(card.id)
    }
  }

  console.log(`[albums] Found ${genreCardMap.size} distinct genre IDs`)

  // ---------------------------------------------------------------------------
  // Build album rows for qualifying genres
  // ---------------------------------------------------------------------------

  const albumRows: Array<{
    id: string
    name: string
    genre_id: number
    card_ids: string[]
    description: string
    reward_description: string
  }> = []

  for (const [genreId, cardIds] of genreCardMap.entries()) {
    if (cardIds.length < MIN_CARDS_PER_ALBUM) {
      console.log(
        `[albums] Skipping genre ${genreId} (${cardIds.length} cards < ${MIN_CARDS_PER_ALBUM} minimum)`
      )
      continue
    }

    const genreName = TMDB_GENRE_NAMES[genreId]
    if (!genreName) {
      console.log(`[albums] Skipping unknown genre ID ${genreId}`)
      continue
    }

    albumRows.push({
      id: `album-${genreName.toLowerCase()}`,
      name: genreName,
      genre_id: genreId,
      card_ids: cardIds,
      description: `Collect all ${genreName} movies`,
      reward_description: 'Completed',
    })
  }

  console.log(`[albums] ${albumRows.length} genres qualify (${MIN_CARDS_PER_ALBUM}+ movies)`)

  if (albumRows.length === 0) {
    throw new Error('No qualifying genres found. Ensure card_pool is seeded.')
  }

  // ---------------------------------------------------------------------------
  // Upsert album rows
  // ---------------------------------------------------------------------------

  const { error: upsertError } = await supabase
    .from('albums')
    .upsert(albumRows, { onConflict: 'id' })

  if (upsertError) {
    throw new Error(`Failed to upsert albums: ${upsertError.message}`)
  }

  // ---------------------------------------------------------------------------
  // Return summary
  // ---------------------------------------------------------------------------

  const summary: SeedAlbumsResult = {
    albumCount: albumRows.length,
    albums: albumRows
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((a) => ({ name: a.name, cardCount: a.card_ids.length })),
  }

  console.log('[albums] Seeding complete!', JSON.stringify(summary, null, 2))
  return summary
}
